
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import type { Product } from '@/lib/types';
import { format } from 'date-fns';
import { Trash2, Edit } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import Link from 'next/link';
import { useSessionUser } from '@/hooks/use-session';
import { useProducts } from '@/hooks/use-data';
import { supabase } from '@/lib/supabase/client';

const productSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  price: z.coerce.number().min(0, 'Price must be a positive number'),
  category: z.string().min(2, 'Category is required'),
  description: z.string().optional(),
  tags: z.string().optional(),
  imageFiles: z
    .any()
    .refine((files) => files?.length >= 1, 'At least one image is required')
    .refine((files) => !files || files.length <= 3, 'You can upload up to 3 images')
    .refine(
      (files) =>
        !files ||
        Array.from(files).every(
          (f: File) => f.size <= 5 * 1024 * 1024 && ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(f.type)
        ),
      'Images must be JPG/PNG/WEBP and under 5MB each'
    ),
});

type ProductFormData = z.infer<typeof productSchema>;

const editPriceSchema = z.object({
    price: z.coerce.number().min(0, 'Price must be a positive number'),
});
type EditPriceFormData = z.infer<typeof editPriceSchema>;

function EditProductDialog({ product, onUpdate }: { product: Product; onUpdate: (id: string, patch: Partial<Product>) => Promise<Product | null> }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const { register, handleSubmit, formState: { errors } } = useForm<EditPriceFormData>({
        resolver: zodResolver(editPriceSchema),
        defaultValues: {
            price: product.price,
        },
    });

    const onSubmit = async (data: EditPriceFormData) => {
        setLoading(true);
        const updated = await onUpdate(product.id, { price: data.price });
        if (updated) {
            toast({ title: 'Success', description: 'Product price updated.' });
            setOpen(false);
        } else {
            toast({ variant: 'destructive', title: 'Update failed', description: 'Could not update product.' });
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Price for {product.name}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor={`edit-price-${product.id}`}>Price ($)</Label>
                        <Input id={`edit-price-${product.id}`} type="number" step="0.01" {...register('price')} />
                        {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Price'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function DeleteProductAlert({ productId, productName, onDelete }: { productId: string, productName: string, onDelete: (id: string) => Promise<boolean> }) {
    const { toast } = useToast();

    const handleDelete = async () => {
        const ok = await onDelete(productId);
        if (ok) {
            toast({ title: 'Product Deleted', description: `${productName} has been removed.` });
        } else {
            toast({ variant: 'destructive', title: 'Delete failed', description: 'Could not delete product.' });
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the product "{productName}".
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function ProductsManager() {
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const { user } = useSessionUser();
  const { data: products, loading: productsLoading, addProduct, deleteProduct, updateProduct } = useProducts(
    user?.role === 'store-owner' && user?.id ? { uploaderId: user.id } : undefined
  );
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  const onSubmit = async (data: ProductFormData) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to add a product.' });
        return;
    }
    if (!supabase) {
      toast({ variant: 'destructive', title: 'Storage not configured', description: 'Supabase client is missing.' });
      return;
    }
    setLoading(true);
    
    try {
      setUploadingImage(true);
      const files: File[] = Array.from(data.imageFiles);
      const uploadResults: string[] = [];

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const filePath = `products/${user.id || user.uid}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });
        if (uploadError) {
          throw uploadError;
        }
        const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(filePath);
        const imageUrl = publicUrlData?.publicUrl;
        if (!imageUrl) {
          throw new Error('Could not get public URL for image');
        }
        uploadResults.push(imageUrl);
      }

      const imageUrl = uploadResults[0];

      const productData = {
        name: data.name,
        price: data.price,
        category: data.category,
        description: data.description || '',
        tags: (data.tags || '').split(',').map(tag => tag.trim()).filter(Boolean),
        imageUrl,
        imageGallery: uploadResults,
        uploaderId: user.id || user.uid,
        uploaderName: user.displayName || 'Unnamed User',
        rating: 0,
        reviewCount: 0,
        has3dPreview: false,
      };
      
      const created = await addProduct(productData as any);
      if (!created) {
        throw new Error('Failed to add product');
      }
      
      toast({
        title: 'Product Added',
        description: `${data.name} has been successfully added.`,
      });
      reset();

    } catch (err) {
      const error = err as any;
      console.error("Debug: Failed to add product:", error);
      toast({
          variant: 'destructive',
          title: 'Operation Failed',
          description: `An error occurred: ${error.message}`,
      });
    } finally {
      setUploadingImage(false);
      setLoading(false);
    }
  };

  const isAllowedToManage = (product: Product) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      if (user.role === 'store-owner' && product.uploaderId === (user.id || user.uid)) return true;
      return false;
  }

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Add New Product</CardTitle>
            <CardDescription>Fill out the form to add a new product to your store.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="add-product-name">Product Name</Label>
                <Input id="add-product-name" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
               <div className="grid gap-2">
                <Label htmlFor="add-product-description">Description</Label>
                <Textarea id="add-product-description" {...register('description')} rows={5} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-product-tags">Tags (comma-separated)</Label>
                <Input id="add-product-tags" {...register('tags')} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-product-price">Price ($)</Label>
                <Input id="add-product-price" type="number" step="0.01" {...register('price')} />
                {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-product-category">Category</Label>
                <Input id="add-product-category" {...register('category')} />
                {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-product-image">Product Images (up to 3, max 5MB each)</Label>
                <Input id="add-product-image" type="file" multiple accept="image/jpeg,image/png,image/webp" {...register('imageFiles')} />
                {errors.imageFiles && <p className="text-xs text-destructive">{errors.imageFiles.message as string}</p>}
              </div>
              <Button type="submit" disabled={loading || productsLoading || uploadingImage}>
                {loading ? 'Adding...' : uploadingImage ? 'Uploading...' : 'Add Product'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <div className="md:col-span-2">
        <Card>
            <CardHeader>
              <CardTitle>My Products</CardTitle>
              <CardDescription>
              {user?.role === 'admin' ? 'A list of all products on the platform.' : 'A list of products you have uploaded.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead className="text-right">Manage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-10 w-10 rounded" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : products && products.length > 0 ? (
                  products.map((product) => (
                    <TableRow key={product.id} className={!isAllowedToManage(product) ? "bg-muted/30" : ""}>
                       <TableCell>
                        <Image
                          src={product.imageUrl || "https://placehold.co/40x40"}
                          alt={product.name}
                          width={40}
                          height={40}
                          className="rounded object-cover"
                        />
                      </TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{product.uploaderName}</TableCell>
                      <TableCell>${product.price.toFixed(2)}</TableCell>
                      <TableCell>
                        {(() => {
                          if (!product.createdAt) return 'N/A';
                          const raw =
                            typeof product.createdAt === 'object' && 'toDate' in product.createdAt
                              ? (product.createdAt as any).toDate()
                              : new Date(product.createdAt as any);
                          const date = raw instanceof Date ? raw : new Date(raw);
                          return isNaN(date.getTime()) ? 'N/A' : format(date, 'PPP');
                        })()}
                      </TableCell>
                      <TableCell className="text-right">
                        {isAllowedToManage(product) ? (
                            <div className="flex justify-end items-center">
                                <EditProductDialog product={product} onUpdate={updateProduct} />
                                <DeleteProductAlert productId={product.id} productName={product.name} onDelete={deleteProduct} />
                            </div>
                        ) : null }
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No products found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ProductsAdminPage() {
  const { user } = useSessionUser();
  
  if (!user) {
      return (
          <div className="text-center py-16">
              <p className="text-muted-foreground">Please <Link href="/login" className="underline text-primary">log in</Link> to manage products.</p>
          </div>
      )
  }

  if (user.role !== 'admin' && user.role !== 'store-owner') {
    return (
        <div className="text-center py-16">
            <h1 className="text-3xl font-bold tracking-tight">Access Denied</h1>
            <p className="text-muted-foreground mt-4">You do not have permission to view this page.</p>
        </div>
    )
  }

  return <ProductsManager />;
}

    
