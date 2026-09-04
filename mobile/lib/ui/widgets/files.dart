import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../core/l10n.dart';
import '../../core/theme.dart';
import '../../data/titans_api.dart';
import 'common.dart';
import 'pixel.dart';

/// Bytes + name of a file the user picked from Files / Photos.
class PickedFile {
  const PickedFile({required this.name, required this.bytes, required this.contentType});

  final String name;
  final Uint8List bytes;
  final String contentType;

  int get size => bytes.length;

  String get sizeLabel {
    if (size < 1024 * 1024) return '${(size / 1024).toStringAsFixed(0)} KB';
    return '${(size / 1024 / 1024).toStringAsFixed(1)} MB';
  }

  String get extension {
    final i = name.lastIndexOf('.');
    return i == -1 ? '' : name.substring(i + 1).toLowerCase();
  }
}

String contentTypeFor(String name) {
  final ext = name.contains('.') ? name.substring(name.lastIndexOf('.') + 1).toLowerCase() : '';
  return switch (ext) {
    'jpg' || 'jpeg' => 'image/jpeg',
    'png' => 'image/png',
    'webp' => 'image/webp',
    'gif' => 'image/gif',
    'heic' => 'image/heic',
    'heif' => 'image/heif',
    'pdf' => 'application/pdf',
    'stl' => 'model/stl',
    _ => 'application/octet-stream',
  };
}

/// Lets the user choose an image (payment screenshot). `null` when cancelled.
Future<PickedFile?> pickImage() async {
  final file = await FilePicker.pickFile(type: FileType.image);
  if (file == null) return null;
  final bytes = await file.readAsBytes();
  return PickedFile(name: file.name, bytes: bytes, contentType: contentTypeFor(file.name));
}

/// Lets the user choose an .STL model. Falls back to "any file" when the
/// platform does not know the STL type, then validates the extension.
Future<PickedFile?> pickStl() async {
  PlatformFile? file;
  try {
    file = await FilePicker.pickFile(type: FileType.custom, allowedExtensions: const ['stl', 'STL']);
  } on PlatformException {
    file = await FilePicker.pickFile();
  }
  if (file == null) return null;
  final bytes = await file.readAsBytes();
  return PickedFile(name: file.name, bytes: bytes, contentType: 'model/stl');
}

/// Card that lets the customer attach a payment screenshot and/or transfer
/// reference to an order (`POST /api/storage/upload` + `/api/payments/proof`).
class PaymentProofCard extends StatefulWidget {
  const PaymentProofCard({super.key, required this.orderId, this.compact = false});

  final String orderId;
  final bool compact;

  @override
  State<PaymentProofCard> createState() => _PaymentProofCardState();
}

class _PaymentProofCardState extends State<PaymentProofCard> {
  PickedFile? _file;
  final _reference = TextEditingController();
  bool _busy = false;
  bool _sent = false;

  @override
  void dispose() {
    _reference.dispose();
    super.dispose();
  }

  Future<void> _pick() async {
    try {
      final picked = await pickImage();
      if (picked != null && mounted) setState(() => _file = picked);
    } catch (e) {
      if (mounted) showSnack(context, context.t.somethingWentWrong);
    }
  }

  Future<void> _send() async {
    final api = context.read<TitansApi>();
    final t = context.t;
    final reference = _reference.text.trim();
    if (_file == null && reference.isEmpty) return;
    setState(() => _busy = true);
    try {
      String? url;
      if (_file != null) {
        final stored = await api.uploadFile(
          kind: 'proof',
          bytes: _file!.bytes,
          fileName: _file!.name,
          contentType: _file!.contentType,
        );
        url = stored.url;
      }
      await api.attachPaymentProof(widget.orderId, proofUrl: url, reference: reference.isEmpty ? null : reference);
      if (mounted) {
        setState(() => _sent = true);
        showSnack(context, t.proofSent);
      }
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.isNetwork ? t.networkError : e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final theme = Theme.of(context);
    final canSend = !_busy && !_sent && (_file != null || _reference.text.trim().isNotEmpty);

    return PixelFrame(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Icon(Icons.receipt_long_outlined, size: 20),
              const SizedBox(width: 8),
              Expanded(child: Text(t.paymentProof.toUpperCase(), style: theme.textTheme.labelLarge)),
              if (_sent) const Icon(Icons.check_circle, color: TitanColors.success),
            ],
          ),
          if (!widget.compact) ...[
            const SizedBox(height: 8),
            Text(t.paymentProofBody, style: theme.textTheme.bodySmall),
          ],
          const SizedBox(height: 14),
          if (_file != null) ...[
            Container(
              height: 160,
              clipBehavior: Clip.hardEdge,
              decoration: BoxDecoration(border: Border.all(color: theme.colorScheme.onSurface, width: 2)),
              child: Image.memory(_file!.bytes, fit: BoxFit.cover, gaplessPlayback: true),
            ),
            const SizedBox(height: 6),
            Text('${_file!.name} · ${_file!.sizeLabel}', style: theme.textTheme.bodySmall),
            const SizedBox(height: 10),
          ],
          PixelButton(
            label: _file == null ? t.uploadScreenshot : t.changeScreenshot,
            icon: Icons.photo_library_outlined,
            variant: PixelButtonVariant.secondary,
            small: true,
            onPressed: _busy || _sent ? null : _pick,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _reference,
            enabled: !_sent,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(labelText: t.transferReference),
          ),
          const SizedBox(height: 12),
          PixelButton(
            label: t.sendProof,
            icon: Icons.send,
            expand: true,
            busy: _busy,
            onPressed: canSend ? _send : null,
          ),
        ],
      ),
    );
  }
}
