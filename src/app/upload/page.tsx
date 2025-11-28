
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UploadCloud, File as FileIcon, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useSessionUser } from '@/hooks/use-session';
import { useUploads } from '@/hooks/use-data';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [modelName, setModelName] = useState('');
  const [notes, setNotes] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [previewName, setPreviewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();
  const { user } = useSessionUser();
  const { addUpload } = useUploads({ skipFetch: true });
  const router = useRouter();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      setFile(null);
      setPreviewName('');
      setError(null);
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size cannot exceed ${MAX_FILE_SIZE_MB}MB.`);
      setFile(null);
      setPreviewName('');
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: `Please select a file smaller than ${MAX_FILE_SIZE_MB}MB.`,
      });
      event.target.value = ''; // Clear the input
      return;
    }

    setFile(selectedFile);
    setPreviewName(selectedFile.name);
    setError(null);
  };

  const fileToDataUrl = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || !user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: !file ? 'Please select a file to upload.' : 'You must be logged in to upload a file.',
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dataUrl = await fileToDataUrl(file);
      const uploadData = {
        modelName,
        fileName: file.name,
        filePath: `uploads/${user.id || user.uid || 'user'}/${Date.now()}-${file.name}`,
        fileUrl: dataUrl,
        downloadURL: dataUrl,
        notes,
        userId: user.id || user.uid,
        userEmail: user.email,
        userDisplayName: user.displayName,
        phoneNumber,
      };
      const created = await addUpload(uploadData as any);
      if (!created) {
        throw new Error('Could not save upload');
      }

      toast({
        title: 'Upload successful!',
        description: `File "${file.name}" has been submitted.`,
      });

      // Reset form
      setFile(null);
      setModelName('');
      setNotes('');
      setPhoneNumber('');
      setPreviewName('');
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if(fileInput) fileInput.value = '';

    } catch (err: any) {
        console.error("Upload failed:", err);
        const errorMessage = err.message || 'An unknown error occurred.';
        setError(`File upload failed: ${errorMessage}`);
        toast({
           variant: 'destructive',
           title: 'Upload Failed',
           description: `Error: ${errorMessage}. Please check the console for more details.`,
       });
    } finally {
        setLoading(false);
    }
  };

  if (!user) {
      return (
          <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center">
                <h2 className="text-2xl font-bold">Please Log In</h2>
                <p className="text-muted-foreground mt-2">You need to be logged in to upload a model for a quote.</p>
                <Button asChild className="mt-4">
                    <Link href="/login">Login</Link>
                </Button>
            </div>
          </div>
      )
  }

  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-4xl font-headline">Upload Your Model</CardTitle>
            <CardDescription>
              Have a 3D model you want us to print? Upload it here! We accept .STL, .OBJ, and .FBX files.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="grid gap-2">
                  <Label htmlFor="model-name">Model Name</Label>
                  <Input 
                    id="model-name" 
                    placeholder="e.g., 'Spaceship v3'" 
                    required 
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone-number">Phone Number</Label>
                  <Input 
                    id="phone-number" 
                    type="tel"
                    placeholder="Your contact number" 
                    required 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>3D Model File</Label>
                <div className="relative flex items-center justify-center w-full">
                  <Label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">.STL, .OBJ, or .FBX (MAX. ${MAX_FILE_SIZE_MB}MB)</p>
                    </div>
                    <Input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".stl,.obj,.fbx" />
                  </Label>
                </div>
                {previewName && !error && (
                  <div className="mt-4 flex items-center justify-center text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                    <FileIcon className="h-5 w-5 mr-2" />
                    <span>{previewName}</span>
                  </div>
                )}
                {error && (
                   <div className="mt-4 flex items-center justify-center text-sm text-destructive bg-destructive/10 rounded-md p-3">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Printing Notes</Label>
                <Textarea 
                  id="notes" 
                  placeholder="Any special instructions? (e.g., material, color, scale)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={!file || !!error || loading}>
                {loading ? 'Uploading...' : 'Get a Quote'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
