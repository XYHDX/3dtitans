"use client";

import { useCurrency } from '@/hooks/use-currency';
import React, { useMemo, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product } from "@/lib/types";
import { Trash2, Edit, Upload, Archive } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
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
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import Link from "next/link";
import { useSessionUser } from "@/hooks/use-session";
import { useProducts } from "@/hooks/use-data";
import { useTranslation } from "@/components/language-provider";
import { uploadErrorMessage, uploadFileDirect } from "@/lib/supabase/direct-upload";
import { acceptAttribute, allowedExtension, UPLOAD_KINDS } from "@/lib/supabase/upload-kinds";
import { ArchivedBadge, RestoreProductButton, activeFirst, isArchivedProduct } from "@/components/admin/product-archive";

const MAX_IMAGES = 3;
const IMAGE_MAX_BYTES = UPLOAD_KINDS.image.maxBytes;
const IMAGE_ACCEPT = acceptAttribute("image");
const PRODUCT_FALLBACK_IMAGE = "/images/product-fallback.svg";

/** Image files are checked by extension (the same rule the server applies). */
const isValidImage = (f: File) => f.size > 0 && f.size <= IMAGE_MAX_BYTES && !!allowedExtension("image", f.name);

// Zod messages are translation keys; they are passed through t() when shown.
const productSchema = z.object({
  name: z.string().min(3, "uploads.products.errName"),
  price: z.coerce.number().min(0, "uploads.products.errPrice"),
  category: z.string().min(2, "uploads.products.errCategory"),
  description: z.string().optional(),
  tags: z.string().optional(),
  imageFiles: z
    .any()
    .refine((files) => files?.length >= 1, "uploads.products.errImageRequired")
    .refine(
      (files) => !files || files.length <= MAX_IMAGES,
      "uploads.products.errImageCount",
    )
    .refine(
      (files) => !files || Array.from(files as FileList).every(isValidImage),
      "uploads.products.errImageFormat",
    ),
});

type ProductFormData = z.infer<typeof productSchema>;

const editProductSchema = z.object({
  name: z.string().min(3, "uploads.products.errName"),
  price: z.coerce.number().min(0, "uploads.products.errPrice"),
  category: z.string().min(2, "uploads.products.errCategory"),
  description: z.string().optional(),
  tags: z.string().optional(),
});
type EditProductFormData = z.infer<typeof editProductSchema>;

type ImageItem =
  | { type: "existing"; url: string; id: string }
  | { type: "new"; file: File; id: string; previewUrl: string };

/** Uploads product photos one by one through signed upload URLs; returns public URLs. */
async function uploadProductImages(files: File[], onStep?: (index: number) => void): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < files.length; i++) {
    onStep?.(i);
    const stored = await uploadFileDirect(files[i], "image");
    urls.push(stored.url);
  }
  return urls;
}

function EditProductDialog({
  product,
  onUpdate,
}: {
  product: Product;
  onUpdate: (id: string, patch: Partial<Product>) => Promise<Product | null>;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const existingGallery = useMemo(
    () =>
      (product.imageGallery && product.imageGallery.length
        ? product.imageGallery
        : [product.imageUrl]
      ).filter(Boolean),
    [product.imageGallery, product.imageUrl],
  );

  const [images, setImages] = useState<ImageItem[]>(() =>
    existingGallery
      .slice(0, MAX_IMAGES)
      .map((url, i) => ({ type: "existing", url, id: `ext-${i}` })),
  );
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const replaceInputRef = React.useRef<HTMLInputElement>(null);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditProductFormData>({
    resolver: zodResolver(editProductSchema),
    defaultValues: {
      name: product.name,
      price: product.price,
      category: product.category,
      description: product.description || "",
      tags: product.tags?.join(", ") || "",
    },
  });

  useEffect(() => {
    return () => {
      images.forEach((img) => {
        if (img.type === "new") {
          URL.revokeObjectURL(img.previewUrl);
        }
      });
    };
  }, [images]);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    isReplace: boolean,
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);

    // Validate
    const validFiles = files.filter((f) => {
      if (f.size > IMAGE_MAX_BYTES) {
        toast({
          variant: "destructive",
          title: t("uploads.products.tooLargeTitle", "File too large"),
          description: t("uploads.products.tooLargeDesc", "{name} is larger than 5 MB.", { name: f.name }),
        });
        return false;
      }
      if (!isValidImage(f)) {
        toast({
          variant: "destructive",
          title: t("uploads.products.badFormatTitle", "Invalid format"),
          description: t("uploads.products.badFormatDesc", "{name} must be a JPG, PNG or WEBP image.", { name: f.name }),
        });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    if (isReplace && replaceIndex !== null) {
      const file = validFiles[0];
      setImages((prev) => {
        const next = [...prev];
        const oldImage = next[replaceIndex];
        if (oldImage && oldImage.type === "new") {
          URL.revokeObjectURL(oldImage.previewUrl);
        }
        next[replaceIndex] = {
          type: "new",
          file,
          id: `new-${Date.now()}-${Math.random()}`,
          previewUrl: URL.createObjectURL(file),
        };
        return next;
      });
      setReplaceIndex(null);
      if (replaceInputRef.current) replaceInputRef.current.value = "";
    } else {
      const availableSlots = MAX_IMAGES - images.length;
      const filesToAdd = validFiles.slice(0, availableSlots);

      if (files.length > availableSlots) {
        toast({
          title: t("uploads.products.limitTitle", "Limit reached"),
          description: t("uploads.products.limitDesc", "Only {count} image(s) added. Maximum {max} in total.", {
            count: availableSlots,
            max: MAX_IMAGES,
          }),
        });
      }

      setImages((prev) => [
        ...prev,
        ...filesToAdd.map((file) => ({
          type: "new" as const,
          file,
          id: `new-${Date.now()}-${Math.random()}`,
          previewUrl: URL.createObjectURL(file),
        })),
      ]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (data: EditProductFormData) => {
    setLoading(true);
    try {
      if (images.length === 0) {
        throw new Error(t("uploads.products.errImageRequired", "At least one image is required."));
      }

      const finalGalleryUrl: string[] = [];
      for (const img of images) {
        if (img.type === "existing") {
          finalGalleryUrl.push(img.url);
        } else {
          try {
            const [url] = await uploadProductImages([img.file]);
            finalGalleryUrl.push(url);
          } catch (err) {
            throw new Error(uploadErrorMessage(err, t, "image"));
          }
        }
      }

      const updated = await onUpdate(product.id, {
        name: data.name,
        price: data.price,
        category: data.category,
        description: data.description || "",
        tags: (data.tags || "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        imageUrl: finalGalleryUrl[0] || product.imageUrl,
        imageGallery: finalGalleryUrl,
      });

      if (updated) {
        toast({ title: t("uploads.products.updatedTitle", "Saved"), description: t("uploads.products.updatedDesc", "Product updated.") });
        setOpen(false);
      } else {
        toast({
          variant: "destructive",
          title: t("uploads.products.updateFailedTitle", "Update failed"),
          description: t("uploads.products.updateFailedDesc", "Could not update the product."),
        });
      }
    } catch (err: any) {
      console.error("Update failed", err);
      toast({
        variant: "destructive",
        title: t("uploads.products.updateFailedTitle", "Update failed"),
        description: err?.message || t("uploads.products.genericError", "Something went wrong. Please try again."),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("uploads.products.editAria", "Edit {name}", { name: product.name })}>
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("uploads.products.editTitle", "Edit {name}", { name: product.name })}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor={`edit-name-${product.id}`}>{t("uploads.products.name", "Name")}</Label>
            <Input id={`edit-name-${product.id}`} {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{t(String(errors.name.message))}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`edit-category-${product.id}`}>{t("uploads.products.category", "Category")}</Label>
            <Input
              id={`edit-category-${product.id}`}
              {...register("category")}
            />
            {errors.category && (
              <p className="text-xs text-destructive">
                {t(String(errors.category.message))}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`edit-price-${product.id}`}>{t("uploads.products.price", "Price")}</Label>
            <Input
              id={`edit-price-${product.id}`}
              type="number"
              step="0.01"
              {...register("price")}
            />
            {errors.price && (
              <p className="text-xs text-destructive">{t(String(errors.price.message))}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`edit-description-${product.id}`}>
              {t("uploads.products.description", "Description")}
            </Label>
            <Textarea
              id={`edit-description-${product.id}`}
              rows={4}
              {...register("description")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`edit-tags-${product.id}`}>
              {t("uploads.products.tags", "Tags (comma-separated)")}
            </Label>
            <Input id={`edit-tags-${product.id}`} {...register("tags")} />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>
                {t("uploads.products.imagesCount", "Product images ({count}/{max})", { count: images.length, max: MAX_IMAGES })}
              </Label>
              {images.length < MAX_IMAGES && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 me-2" /> {t("uploads.products.addImage", "Add image")}
                </Button>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              accept={IMAGE_ACCEPT}
              onChange={(e) => handleFileChange(e, false)}
            />
            <input
              type="file"
              ref={replaceInputRef}
              className="hidden"
              accept={IMAGE_ACCEPT}
              onChange={(e) => handleFileChange(e, true)}
            />

            <div className="grid grid-cols-3 gap-4">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  className="relative group aspect-square overflow-hidden rounded-md border bg-muted"
                >
                  <Image
                    src={img.type === "existing" ? img.url : img.previewUrl}
                    alt={t("uploads.products.imageAlt", "{name} image {n}", { name: product.name, n: idx + 1 })}
                    fill
                    sizes="200px"
                    className="object-cover"
                  />

                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 w-24 text-xs"
                      onClick={() => {
                        setReplaceIndex(idx);
                        replaceInputRef.current?.click();
                      }}
                    >
                      <Edit className="h-3 w-3 me-2" /> {t("uploads.products.replace", "Replace")}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-8 w-24 text-xs"
                      onClick={() => {
                        setImages((prev) => {
                          const next = [...prev];
                          const removed = next.splice(idx, 1)[0];
                          if (removed.type === "new") {
                            URL.revokeObjectURL(removed.previewUrl);
                          }
                          return next;
                        });
                      }}
                    >
                      <Trash2 className="h-3 w-3 me-2" /> {t("uploads.products.remove", "Remove")}
                    </Button>
                  </div>
                  {idx === 0 && (
                    <div className="absolute top-2 start-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                      {t("uploads.products.cover", "COVER")}
                    </div>
                  )}
                </div>
              ))}

              {images.length === 0 && (
                <div className="col-span-3 py-8 text-center border-2 border-dashed rounded-md bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    {t("uploads.products.noImages", "No images. Please add at least one product image.")}
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                {t("uploads.common.cancel", "Cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? t("uploads.common.saving", "Saving...") : t("uploads.products.saveChanges", "Save changes")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * "Delete" archives the product (DELETE /api/products/[id] sets archivedAt):
 * it disappears from the shop, orders keep it, and it can be restored.
 */
function ArchiveProductAlert({
  productId,
  productName,
  onArchive,
  onArchived,
}: {
  productId: string;
  productName: string;
  onArchive: (id: string) => Promise<boolean>;
  onArchived?: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleArchive = async () => {
    const ok = await onArchive(productId).catch(() => false);
    if (ok) {
      toast({
        title: t("uploads.archive.archivedTitle", "Product archived"),
        description: t("uploads.archive.archivedDesc", "{name} was removed from the shop. You can restore it from the Archived list.", {
          name: productName,
        }),
      });
      await onArchived?.();
    } else {
      toast({
        variant: "destructive",
        title: t("uploads.archive.archiveFailedTitle", "Archive failed"),
        description: t("uploads.archive.archiveFailedDesc", "Could not archive the product. Please try again."),
      });
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("uploads.archive.archiveAria", "Archive {name}", { name: productName })}
          title={t("uploads.archive.archive", "Archive")}
        >
          <Archive className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("uploads.archive.confirmTitle", "Archive this product?")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              "uploads.archive.confirmDesc",
              "\"{name}\" will disappear from the shop and can no longer be ordered. Orders that already include it keep it. You can restore it at any time from the Archived list.",
              { name: productName },
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("uploads.common.cancel", "Cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleArchive}>
            {t("uploads.archive.archive", "Archive")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ProductsManager() {
  const { format: formatPrice } = useCurrency();
  const { t, locale } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [uploadStep, setUploadStep] = useState<{ index: number; total: number } | null>(null);
  const { user } = useSessionUser();
  const {
    data: products,
    loading: productsLoading,
    refresh: refreshProducts,
    addProduct,
    deleteProduct,
    updateProduct,
  } = useProducts(
    user?.role === "store-owner" && user?.id
      ? { uploaderId: user.id }
      : undefined,
  );
  const { toast } = useToast();
  const [view, setView] = useState<"active" | "archived" | "all">("active");

  // Archived products stay listed for their admin / owner, below active ones.
  const archivedCount = useMemo(() => (products || []).filter(isArchivedProduct).length, [products]);
  const activeCount = (products?.length || 0) - archivedCount;
  const visibleProducts = useMemo(() => {
    const list = products || [];
    if (view === "active") return list.filter((p) => !isArchivedProduct(p));
    if (view === "archived") return list.filter(isArchivedProduct);
    return activeFirst(list);
  }, [products, view]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  const formatDate = (value: unknown) => {
    if (!value) return t("uploads.common.na", "N/A");
    const raw =
      typeof value === "object" && value !== null && "toDate" in value
        ? (value as any).toDate()
        : new Date(value as any);
    const date = raw instanceof Date ? raw : new Date(raw);
    return isNaN(date.getTime())
      ? t("uploads.common.na", "N/A")
      : date.toLocaleDateString(locale === "ar" ? "ar-SY" : "en-US", { dateStyle: "medium" });
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: t("uploads.common.errorTitle", "Error"),
        description: t("uploads.products.loginToAdd", "You must be logged in to add a product."),
      });
      return;
    }
    setLoading(true);

    try {
      const files: File[] = Array.from(data.imageFiles as FileList);
      let uploadResults: string[];
      try {
        uploadResults = await uploadProductImages(files, (index) => setUploadStep({ index, total: files.length }));
      } catch (err) {
        throw new Error(uploadErrorMessage(err, t, "image"));
      } finally {
        setUploadStep(null);
      }

      const imageUrl = uploadResults[0];

      const productData = {
        name: data.name,
        price: data.price,
        category: data.category,
        description: data.description || "",
        tags: (data.tags || "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        imageUrl,
        imageGallery: uploadResults,
        uploaderId: user.id || user.uid,
        uploaderName: user.displayName || "Unnamed User",
        rating: 0,
        reviewCount: 0,
        has3dPreview: false,
      };

      const created = await addProduct(productData as any);
      if (!created) {
        throw new Error(t("uploads.products.addFailedDesc", "The product could not be saved. Please try again."));
      }

      toast({
        title: t("uploads.products.addedTitle", "Product added"),
        description: t("uploads.products.addedDesc", "{name} has been added.", { name: data.name }),
      });
      reset();
    } catch (err) {
      const error = err as any;
      console.error("Failed to add product:", error);
      toast({
        variant: "destructive",
        title: t("uploads.products.addFailedTitle", "Could not add the product"),
        description: error?.message || t("uploads.products.genericError", "Something went wrong. Please try again."),
      });
    } finally {
      setLoading(false);
    }
  };

  const isAllowedToManage = (product: Product) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    if (
      user.role === "store-owner" &&
      product.uploaderId === (user.id || user.uid)
    )
      return true;
    return false;
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 overflow-x-hidden">
      <div className="grid min-w-0 gap-6 md:grid-cols-3">
        <Card className="w-full md:col-span-1 min-w-0">
          <CardHeader>
            <CardTitle>{t("uploads.products.addTitle", "Add new product")}</CardTitle>
            <CardDescription>
              {t("uploads.products.addDesc", "Fill out the form to add a new product to your store.")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="add-product-name">{t("uploads.products.productName", "Product name")}</Label>
                <Input id="add-product-name" {...register("name")} />
                {errors.name && (
                  <p className="text-xs text-destructive">
                    {t(String(errors.name.message))}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-product-description">{t("uploads.products.description", "Description")}</Label>
                <Textarea
                  id="add-product-description"
                  {...register("description")}
                  rows={5}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-product-tags">{t("uploads.products.tags", "Tags (comma-separated)")}</Label>
                <Input id="add-product-tags" {...register("tags")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-product-price">{t("uploads.products.price", "Price")}</Label>
                <Input
                  id="add-product-price"
                  type="number"
                  step="0.01"
                  {...register("price")}
                />
                {errors.price && (
                  <p className="text-xs text-destructive">
                    {t(String(errors.price.message))}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-product-category">{t("uploads.products.category", "Category")}</Label>
                <Input id="add-product-category" {...register("category")} />
                {errors.category && (
                  <p className="text-xs text-destructive">
                    {t(String(errors.category.message))}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-product-image">
                  {t("uploads.products.imagesLabel", "Product images (up to 3, max 5 MB each)")}
                </Label>
                <Input
                  id="add-product-image"
                  type="file"
                  multiple
                  accept={IMAGE_ACCEPT}
                  {...register("imageFiles")}
                />
                {errors.imageFiles && (
                  <p className="text-xs text-destructive">
                    {t(String(errors.imageFiles.message))}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                disabled={loading || productsLoading}
              >
                {uploadStep
                  ? t("uploads.products.uploadingStep", "Uploading image {n} of {total}...", {
                      n: uploadStep.index + 1,
                      total: uploadStep.total,
                    })
                  : loading
                    ? t("uploads.products.adding", "Adding...")
                    : t("uploads.products.addButton", "Add product")}
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card className="w-full md:col-span-2 min-w-0">
          <CardHeader className="gap-3">
            <CardTitle>{t("uploads.products.listTitle", "My products")}</CardTitle>
            <CardDescription>
              {user?.role === "admin"
                ? t("uploads.products.listDescAdmin", "All products on the platform.")
                : t("uploads.products.listDescOwner", "Products you have uploaded.")}
            </CardDescription>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={t("uploads.archive.filterLabel", "Show products")}
            >
              {(
                [
                  ["active", t("uploads.archive.filterActive", "Active ({count})", { count: activeCount })],
                  ["archived", t("uploads.archive.filterArchived", "Archived ({count})", { count: archivedCount })],
                  ["all", t("uploads.archive.filterAll", "All")],
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={view === value ? "default" : "outline"}
                  aria-pressed={view === value}
                  onClick={() => setView(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("uploads.products.colImage", "Image")}</TableHead>
                  <TableHead>{t("uploads.products.colName", "Name")}</TableHead>
                  <TableHead>{t("uploads.products.colUploadedBy", "Uploaded by")}</TableHead>
                  <TableHead>{t("uploads.products.colPrice", "Price")}</TableHead>
                  <TableHead>{t("uploads.products.colDate", "Date added")}</TableHead>
                  <TableHead className="text-end">{t("uploads.products.colManage", "Manage")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-10 w-10 rounded" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell className="text-end">
                        <Skeleton className="h-8 w-20 ms-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : visibleProducts.length > 0 ? (
                  visibleProducts.map((product) => {
                    const archived = isArchivedProduct(product);
                    return (
                    <TableRow
                      key={product.id}
                      className={
                        archived ? "bg-muted/40 text-muted-foreground" : !isAllowedToManage(product) ? "bg-muted/30" : ""
                      }
                    >
                      <TableCell>
                        <Image
                          src={product.imageUrl || PRODUCT_FALLBACK_IMAGE}
                          alt={product.name}
                          width={40}
                          height={40}
                          className={`rounded object-cover${archived ? " opacity-60" : ""}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{product.name}</span>
                          {archived && <ArchivedBadge />}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {product.uploaderName}
                      </TableCell>
                      <TableCell>{formatPrice(product.price)}</TableCell>
                      <TableCell>{formatDate(product.createdAt)}</TableCell>
                      <TableCell className="text-end">
                        {isAllowedToManage(product) ? (
                          <div className="flex justify-end items-center">
                            <EditProductDialog
                              product={product}
                              onUpdate={updateProduct}
                            />
                            {archived ? (
                              <RestoreProductButton product={product} onRestored={refreshProducts} />
                            ) : (
                              <ArchiveProductAlert
                                productId={product.id}
                                productName={product.name}
                                onArchive={deleteProduct}
                                onArchived={refreshProducts}
                              />
                            )}
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      {view === "archived"
                        ? t("uploads.archive.emptyArchived", "No archived products.")
                        : t("uploads.products.empty", "No products found.")}
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
  const { t } = useTranslation();

  if (!user) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">
          <Link href="/login?next=/admin/products" className="underline decoration-primary decoration-2 underline-offset-4 text-foreground">
            {t("uploads.products.loginLink", "Log in")}
          </Link>{" "}
          {t("uploads.products.loginToManage", "to manage products.")}
        </p>
      </div>
    );
  }

  if (user.role !== "admin" && user.role !== "store-owner") {
    return (
      <div className="text-center py-16">
        <h1 className="text-3xl font-bold tracking-tight">{t("uploads.common.accessDenied", "Access denied")}</h1>
        <p className="text-muted-foreground mt-4">
          {t("uploads.common.noPermission", "You do not have permission to view this page.")}
        </p>
      </div>
    );
  }

  return <ProductsManager />;
}
