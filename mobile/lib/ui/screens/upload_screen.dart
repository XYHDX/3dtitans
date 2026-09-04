import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart';
import '../../core/l10n.dart';
import '../../core/theme.dart';
import '../../data/models.dart';
import '../../data/titans_api.dart';
import '../../state/auth_controller.dart';
import '../widgets/common.dart';
import '../widgets/files.dart';
import '../widgets/pixel.dart';
import 'account_screen.dart';

const int _kMaxStlMb = 25;

/// "Upload for print": pick an .STL, describe it, get a quote — plus the
/// list of the user's previous requests and their status.
class UploadScreen extends StatefulWidget {
  const UploadScreen({super.key});

  static Future<void> open(BuildContext context) => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const UploadScreen()),
      );

  @override
  State<UploadScreen> createState() => _UploadScreenState();
}

class _UploadScreenState extends State<UploadScreen> {
  final _formKey = GlobalKey<FormState>();
  final _modelName = TextEditingController();
  final _phone = TextEditingController();
  final _notes = TextEditingController();
  PickedFile? _file;
  String? _fileError;
  bool _busy = false;
  List<PrintUpload>? _uploads;
  String? _loadedForUser;

  @override
  void dispose() {
    _modelName.dispose();
    _phone.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _loadUploads() async {
    try {
      final list = await context.read<TitansApi>().uploads();
      if (mounted) setState(() => _uploads = list);
    } catch (_) {
      if (mounted) setState(() => _uploads = const []);
    }
  }

  Future<void> _pick() async {
    final t = context.t;
    try {
      final picked = await pickStl();
      if (picked == null || !mounted) return;
      if (picked.extension != 'stl') {
        setState(() {
          _file = null;
          _fileError = t.onlyStlFiles;
        });
        return;
      }
      if (picked.size > _kMaxStlMb * 1024 * 1024) {
        setState(() {
          _file = null;
          _fileError = t.fileTooLarge(_kMaxStlMb);
        });
        return;
      }
      setState(() {
        _file = picked;
        _fileError = null;
        if (_modelName.text.trim().isEmpty) {
          _modelName.text = picked.name.replaceAll(RegExp(r'\.stl$', caseSensitive: false), '');
        }
      });
    } catch (_) {
      if (mounted) showSnack(context, t.somethingWentWrong);
    }
  }

  Future<void> _submit() async {
    final t = context.t;
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (_file == null) {
      setState(() => _fileError = t.onlyStlFiles);
      return;
    }
    final api = context.read<TitansApi>();
    setState(() => _busy = true);
    try {
      final stored = await api.uploadFile(
        kind: 'model',
        bytes: _file!.bytes,
        fileName: _file!.name,
        contentType: 'model/stl',
      );
      final created = await api.createUpload(
        modelName: _modelName.text.trim(),
        file: stored,
        fileName: _file!.name,
        notes: _notes.text.trim(),
        phoneNumber: _phone.text.trim(),
      );
      if (!mounted) return;
      setState(() {
        _file = null;
        _modelName.clear();
        _notes.clear();
        _uploads = [created, ...?_uploads];
      });
      showSnack(context, t.uploadSuccess);
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
    final auth = context.watch<AuthController>();

    if (auth.isLoggedIn && _loadedForUser != auth.user!.id) {
      _loadedForUser = auth.user!.id;
      _uploads = null;
      WidgetsBinding.instance.addPostFrameCallback((_) => _loadUploads());
    }

    return Scaffold(
      appBar: AppBar(title: Text(t.uploadTitle.toUpperCase())),
      body: PixelGridBackground(
        child: !auth.isLoggedIn
            ? ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Text(t.uploadSubtitle, style: theme.textTheme.bodyMedium),
                  const SizedBox(height: 16),
                  const LoginForm(),
                ],
              )
            : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Text(t.uploadSubtitle, style: theme.textTheme.bodyMedium),
                  const SizedBox(height: 16),
                  if (auth.user!.isStoreOwner)
                    PixelFrame(
                      padding: const EdgeInsets.all(16),
                      child: Text(t.storeOwnersCannotOrder, style: theme.textTheme.bodyMedium),
                    )
                  else
                    PixelFrame(
                      padding: const EdgeInsets.all(16),
                      child: Form(
                        key: _formKey,
                        autovalidateMode: AutovalidateMode.onUserInteraction,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            // ---- file ----
                            GestureDetector(
                              onTap: _busy ? null : _pick,
                              child: Container(
                                padding: const EdgeInsets.all(18),
                                decoration: BoxDecoration(
                                  color: theme.colorScheme.surfaceContainer,
                                  border: Border.all(
                                    color: _fileError != null
                                        ? TitanColors.destructive
                                        : theme.colorScheme.onSurface,
                                    width: 2,
                                  ),
                                ),
                                child: Column(
                                  children: [
                                    Icon(
                                      _file == null ? Icons.upload_file_outlined : Icons.view_in_ar_outlined,
                                      size: 36,
                                    ),
                                    const SizedBox(height: 10),
                                    Text(
                                      _file == null ? t.chooseStlFile : _file!.name,
                                      textAlign: TextAlign.center,
                                      style: theme.textTheme.titleSmall,
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      _file == null ? t.uploadFileHint(_kMaxStlMb) : _file!.sizeLabel,
                                      style: theme.textTheme.bodySmall,
                                    ),
                                    if (_fileError != null) ...[
                                      const SizedBox(height: 6),
                                      Text(
                                        _fileError!,
                                        style: theme.textTheme.bodySmall?.copyWith(color: TitanColors.destructive),
                                      ),
                                    ],
                                    const SizedBox(height: 12),
                                    PixelButton(
                                      label: _file == null ? t.chooseStlFile : t.changeFile,
                                      icon: Icons.folder_open,
                                      small: true,
                                      variant: PixelButtonVariant.secondary,
                                      onPressed: _busy ? null : _pick,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(height: 16),
                            Text(t.modelName, style: theme.textTheme.labelMedium),
                            const SizedBox(height: 6),
                            TextFormField(
                              controller: _modelName,
                              textCapitalization: TextCapitalization.sentences,
                              validator: (v) => (v == null || v.trim().isEmpty) ? t.required : null,
                            ),
                            const SizedBox(height: 12),
                            Text(t.phoneNumber, style: theme.textTheme.labelMedium),
                            const SizedBox(height: 6),
                            TextFormField(
                              controller: _phone,
                              keyboardType: TextInputType.phone,
                              textDirection: TextDirection.ltr,
                              validator: (v) => (v == null || v.trim().length < 6) ? t.required : null,
                            ),
                            const SizedBox(height: 12),
                            Text(t.orderNotes, style: theme.textTheme.labelMedium),
                            const SizedBox(height: 6),
                            TextFormField(
                              controller: _notes,
                              minLines: 3,
                              maxLines: 6,
                              decoration: InputDecoration(hintText: t.uploadNotesHint),
                            ),
                            const SizedBox(height: 16),
                            PixelButton(
                              label: _busy ? t.uploading : t.sendForQuote,
                              icon: Icons.send,
                              expand: true,
                              busy: _busy,
                              onPressed: _busy ? null : _submit,
                            ),
                          ],
                        ),
                      ),
                    ),
                  SectionHeader(title: t.myUploads),
                  if (_uploads == null)
                    const Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(child: CircularProgressIndicator()),
                    )
                  else if (_uploads!.isEmpty)
                    Text(t.noUploadsYet, style: theme.textTheme.bodySmall)
                  else
                    for (final u in _uploads!) ...[
                      _UploadTile(upload: u),
                      const SizedBox(height: 10),
                    ],
                  const SizedBox(height: 24),
                ],
              ),
      ),
    );
  }
}

class _UploadTile extends StatelessWidget {
  const _UploadTile({required this.upload});

  final PrintUpload upload;

  @override
  Widget build(BuildContext context) {
    final t = context.t;
    final theme = Theme.of(context);
    final status = switch (upload.status.toLowerCase()) {
      'new' => t.uploadStatusNew,
      'assigned' => t.uploadStatusAssigned,
      'printing' => t.uploadStatusPrinting,
      'done' || 'finished' || 'completed' => t.uploadStatusDone,
      _ => upload.status,
    };
    return PixelFrame(
      shadow: 3,
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: TitanColors.arcadeYellow,
              border: Border.all(color: theme.colorScheme.onSurface, width: 2),
            ),
            child: const Icon(Icons.view_in_ar_outlined, color: TitanColors.titanBlack),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(upload.modelName.isEmpty ? upload.fileName : upload.modelName,
                    maxLines: 1, overflow: TextOverflow.ellipsis, style: theme.textTheme.titleSmall),
                Text('${upload.fileName} · ${Fmt.shortDate(upload.createdAt)}',
                    maxLines: 1, overflow: TextOverflow.ellipsis, style: theme.textTheme.bodySmall),
              ],
            ),
          ),
          const SizedBox(width: 8),
          PixelBadge(status),
        ],
      ),
    );
  }
}
