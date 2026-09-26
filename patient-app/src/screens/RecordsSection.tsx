import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Button, Card, Field, Input, Loading, Notice, Row } from '../components/ui';
import {
  addRecord,
  deleteRecord,
  fileUrl,
  myRecords,
  openFile,
  type MedicalRecord,
} from '../lib/clinicApi';
import { clinic, radius, space, type } from '../theme';

const KINDS = [
  { id: 'prescription', label: 'Prescription', icon: '℞' },
  { id: 'xray', label: 'X-ray / scan', icon: '🦴' },
  { id: 'report', label: 'Report', icon: '📄' },
  { id: 'note', label: 'Note', icon: '📝' },
] as const;

const kindOf = (k: string) => KINDS.find((x) => x.id === k) ?? KINDS[2];

const prettyDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * The patient's medical records: what the clinic files after a visit, plus
 * anything the patient adds themselves (an old X-ray, a report from elsewhere).
 */
export default function RecordsSection({ token }: { token: string }) {
  const [items, setItems] = useState<MedicalRecord[] | null>(null);
  const [failed, setFailed] = useState('');
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState<MedicalRecord | null>(null);

  const load = useCallback(() => {
    myRecords(token)
      .then((d) => setItems(d.items))
      .catch((e) => {
        setFailed((e as Error).message);
        setItems([]);
      });
  }, [token]);

  useEffect(load, [load]);

  const remove = (r: MedicalRecord) =>
    Alert.alert('Remove this record?', r.title, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRecord(token, r.id);
            load();
          } catch (e) {
            setFailed((e as Error).message);
          }
        },
      },
    ]);

  return (
    <>
      {!!failed && <Notice text={failed} />}

      {items === null ? (
        <Card><Loading /></Card>
      ) : items.length === 0 ? (
        <Card>
          <Text style={type.body}>
            Nothing here yet. Records the clinic files after a visit appear automatically — and you can add
            an old X-ray or a report from another clinic yourself.
          </Text>
          <Button label="Add a record" variant="outline" style={{ marginTop: space.md }} onPress={() => setAdding(true)} />
        </Card>
      ) : (
        <>
          {items.map((r) => (
            <Pressable key={r.id} onPress={() => r.file && setViewing(r)} onLongPress={() => r.added_by === 'patient' && remove(r)}>
              <Card>
                <Row style={{ alignItems: 'flex-start' }}>
                  <View style={s.kindIcon}>
                    <Text style={{ fontSize: 17 }}>{kindOf(r.kind).icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={type.h3}>{r.title}</Text>
                    <Text style={type.small}>
                      {kindOf(r.kind).label} · {prettyDate(r.date)}
                      {r.added_by === 'patient' ? ' · added by you' : r.doctor ? ` · ${r.doctor}` : ' · from the clinic'}
                    </Text>
                    {!!r.notes && <Text style={[type.small, { marginTop: 4, color: clinic.ink }]}>{r.notes}</Text>}
                  </View>
                  {!!r.file && (
                    <View style={s.thumb}>
                      {r.file_type === 'image' ? (
                        <Image source={{ uri: fileUrl(r.file) }} style={s.thumbImg} />
                      ) : (
                        <Text style={{ fontSize: 18 }}>📎</Text>
                      )}
                    </View>
                  )}
                </Row>
              </Card>
            </Pressable>
          ))}
          <Button label="Add a record" variant="outline" onPress={() => setAdding(true)} />
        </>
      )}

      <AddRecord
        open={adding}
        token={token}
        onClose={() => setAdding(false)}
        onSaved={() => {
          setAdding(false);
          load();
        }}
      />

      {/* Full-screen viewer for an attached image */}
      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <Pressable style={s.viewer} onPress={() => setViewing(null)}>
          {viewing?.file_type === 'image' ? (
            <Image source={{ uri: fileUrl(viewing.file!) }} style={s.viewerImg} resizeMode="contain" />
          ) : (
            <Card style={{ margin: space.lg }}>
              <Text style={type.h3}>{viewing?.title}</Text>
              <Text style={[type.body, { marginTop: 6 }]}>This file opens in your browser or PDF reader.</Text>
              <Button
                label="Open file"
                style={{ marginTop: space.md }}
                onPress={() => viewing?.file && openFile(viewing.file)}
              />
            </Card>
          )}
        </Pressable>
      </Modal>
    </>
  );
}

function AddRecord({
  open,
  token,
  onClose,
  onSaved,
}: {
  open: boolean;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [kind, setKind] = useState<string>('report');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<{ uri: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');

  const reset = () => {
    setKind('report');
    setTitle('');
    setNotes('');
    setFile(null);
    setFailed('');
  };

  const pick = async (from: 'camera' | 'library') => {
    const perm =
      from === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setFailed('Please allow access so the photo can be attached.');

    const res =
      from === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.75 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.75, mediaTypes: ['images'] });
    if (res.canceled) return;
    const asset = res.assets[0];
    setFile({ uri: asset.uri, name: asset.fileName || 'record.jpg' });
  };

  const save = async () => {
    if (title.trim().length < 2) return setFailed('Please give this record a name.');
    setBusy(true);
    setFailed('');
    try {
      await addRecord(token, {
        kind,
        title: title.trim(),
        notes: notes.trim() || undefined,
        fileUri: file?.uri,
        fileName: file?.name,
      });
      reset();
      onSaved();
    } catch (e) {
      setFailed((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.sheetWrap}>
        <Pressable style={s.sheetScrim} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.grabber} />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: space.md, paddingBottom: space.lg }}>
            <Text style={type.h2}>Add a record</Text>

            <Field label="What is it?">
              <View style={s.kinds}>
                {KINDS.map((k) => (
                  <Pressable key={k.id} onPress={() => setKind(k.id)} style={[s.kindChip, kind === k.id && s.kindChipOn]}>
                    <Text style={[s.kindChipText, kind === k.id && { color: '#fff' }]}>
                      {k.icon}  {k.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Field>

            <Field label="Name">
              <Input value={title} onChangeText={setTitle} placeholder="OPG X-ray, blood report…" />
            </Field>

            <Field label="Notes (optional)">
              <Input
                value={notes}
                onChangeText={setNotes}
                placeholder="Where it was taken, what it was for…"
                multiline
                style={{ minHeight: 80, paddingTop: 12 }}
              />
            </Field>

            <Field label="Attach a photo (optional)">
              {file ? (
                <Row>
                  <Image source={{ uri: file.uri }} style={s.preview} />
                  <Button label="Remove" variant="ghost" onPress={() => setFile(null)} />
                </Row>
              ) : (
                <Row style={{ gap: space.sm }}>
                  <Button label="Take photo" variant="outline" style={{ flex: 1 }} onPress={() => pick('camera')} />
                  <Button label="Choose file" variant="outline" style={{ flex: 1 }} onPress={() => pick('library')} />
                </Row>
              )}
            </Field>

            {!!failed && <Notice text={failed} />}

            <Row style={{ gap: space.sm }}>
              <Button label="Save record" loading={busy} style={{ flex: 1 }} onPress={save} />
              <Button label="Cancel" variant="outline" onPress={onClose} />
            </Row>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  kindIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: clinic.mist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: { width: 46, height: 46, borderRadius: radius.sm, backgroundColor: clinic.ivoryDeep, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%' },

  viewer: { flex: 1, backgroundColor: 'rgba(12,16,22,0.94)', alignItems: 'center', justifyContent: 'center' },
  viewerImg: { width: '94%', height: '80%' },

  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheetScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(16,24,40,0.4)' },
  sheet: {
    backgroundColor: clinic.ivory,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.md,
    maxHeight: '88%',
  },
  grabber: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: '#cfc9c3', marginBottom: space.md },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kindChip: {
    borderWidth: 1,
    borderColor: '#b9c3cc',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  kindChipOn: { backgroundColor: clinic.slate, borderColor: clinic.slate },
  kindChipText: { fontSize: 13.5, color: clinic.ink, fontWeight: '600' },
  preview: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: clinic.ivoryDeep },
});
