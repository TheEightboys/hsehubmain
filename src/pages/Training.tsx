import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Search,
  GraduationCap,
  Video,
  FileText,
  Type,
  Link,
  FileArchive,
  FolderOpen,
  Trash2,
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const courseSchema = z.object({
  name: z.string().min(1, "Course name is required"),
  description: z.string().optional(),
});

const lessonSchema = z.object({
  name: z.string().min(1, "Lesson name is required"),
  type: z.enum(["subchapter", "video_audio", "pdf", "text", "website_link", "zip_file"]),
  content_url: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  content_text: z.string().optional(),
  description: z.string().optional(),
  tags: z.string().optional(),
});

type CourseFormData = z.infer<typeof courseSchema>;
type LessonFormData = z.infer<typeof lessonSchema>;

interface Course {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface Lesson {
  id: string;
  course_id: string;
  name: string;
  type: "subchapter" | "video_audio" | "pdf" | "text" | "website_link" | "zip_file";
  content_url: string | null;
  content_data: any;
  order_index: number;
  status: "draft" | "published";
}

export default function Training() {
  const { user, loading, companyId } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false);
  const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false);
  const [isLessonDetailOpen, setIsLessonDetailOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const courseForm = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const lessonForm = useForm<LessonFormData>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      name: "",
      type: "video_audio",
      content_url: "",
      content_text: "",
      description: "",
      tags: "",
    },
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (user && companyId) {
      fetchCourses();
    }
  }, [user, loading, navigate, companyId]);

  const fetchCourses = async () => {
    if (!companyId) return;

    setLoadingData(true);
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (err: any) {
      toast({
        title: "Error loading courses",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const fetchLessons = async (courseId: string) => {
    try {
      const { data, error } = await supabase
        .from("course_lessons")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      setLessons(data || []);
    } catch (err: any) {
      toast({
        title: "Error loading lessons",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const onCourseSubmit = async (data: CourseFormData) => {
    if (!companyId) return;

    try {
      const { error } = await supabase.from("courses").insert([
        {
          company_id: companyId,
          name: data.name,
          description: data.description || null,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Course created successfully",
      });
      setIsCourseDialogOpen(false);
      courseForm.reset();
      fetchCourses();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const onCourseDelete = async (courseId: string, courseName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the course when clicking delete

    if (!confirm(`Are you sure you want to delete "${courseName}"? This will also delete all lessons in this course.`)) {
      return;
    }

    try {
      // First delete all lessons in the course
      const { error: lessonsError } = await supabase
        .from("course_lessons")
        .delete()
        .eq("course_id", courseId);

      if (lessonsError) throw lessonsError;

      // Then delete the course
      const { error: courseError } = await supabase
        .from("courses")
        .delete()
        .eq("id", courseId);

      if (courseError) throw courseError;

      toast({
        title: "Success",
        description: "Course deleted successfully",
      });
      fetchCourses();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const onLessonSubmit = async (data: LessonFormData) => {
    if (!selectedCourse) return;

    try {
      // Prepare content data based on type
      const contentData: any = {};

      if (data.type === "text" && data.content_text) {
        contentData.text_content = data.content_text;
      }

      if (data.description) contentData.description = data.description;
      if (data.tags) contentData.tags = data.tags;

      const { error } = await supabase.from("course_lessons").insert([
        {
          course_id: selectedCourse.id,
          name: data.name,
          type: data.type,
          content_url: data.content_url || null,
          content_data: Object.keys(contentData).length > 0 ? contentData : null,
          order_index: lessons.length,
          status: "draft",
        },
      ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Lesson added successfully",
      });
      setIsLessonDialogOpen(false);
      lessonForm.reset();
      fetchLessons(selectedCourse.id);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleCloudinaryUpload = (onComplete: (url: string) => void) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME?.trim();
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET?.trim().replace(/"/g, "");

    console.log("Cloudinary Config Debug:", {
      cloudName,
      uploadPreset,
      envCloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
      envPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
    });

    // DEBUG ALERT REMOVED

    if (!cloudName || !uploadPreset) {
      toast({
        title: "Configuration Error",
        description: "Cloudinary credentials missing in .env",
        variant: "destructive",
      });
      return;
    }

    const myWidget = window.cloudinary.createUploadWidget(
      {
        cloudName: cloudName,
        uploadPreset: uploadPreset,
        sources: ["local", "url", "camera", "google_drive"],
        multiple: false,
        resourceType: "auto",
        clientAllowedFormats: ["mp4", "webm", "mp3", "pdf", "zip", "rar", "7z", "png", "jpg", "jpeg"],
        maxFileSize: 524288000, // 500MB
        styles: {
          palette: {
            window: "#FFFFFF",
            windowBorder: "#90A0B3",
            tabIcon: "#0078FF",
            menuIcons: "#5A616A",
            textDark: "#000000",
            textLight: "#FFFFFF",
            link: "#0078FF",
            action: "#FF620C",
            inactiveTabIcon: "#0E2F5A",
            error: "#F44235",
            inProgress: "#0078FF",
            complete: "#20B832",
            sourceBg: "#E4EBF1"
          }
        }
      },
      (error: any, result: any) => {
        if (!error && result && result.event === "success") {
          console.log("Done! Here is the image info: ", result.info);
          onComplete(result.info.secure_url);
          toast({
            title: "Upload Successful",
            description: "File uploaded successfully",
          });
        } else if (error) {
          console.error("Upload error:", error);
          if (error.statusText !== "abort") {
            // Optional: handle specific errors
          }
        }
      }
    );

    myWidget.open();
  };

  const onLessonDelete = async (lessonId: string, lessonName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the detail dialog

    if (!confirm(`Are you sure you want to delete "${lessonName}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("course_lessons")
        .delete()
        .eq("id", lessonId);

      if (error) throw error;

      setLessons(lessons.filter((l) => l.id !== lessonId));
      toast({
        title: "Success",
        description: "Lesson deleted successfully",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video_audio":
        return <Video className="w-4 h-4" />;
      case "pdf":
        return <FileText className="w-4 h-4" />;
      case "text":
        return <Type className="w-4 h-4" />;
      case "website_link":
        return <Link className="w-4 h-4" />;
      case "zip_file":
        return <FileArchive className="w-4 h-4" />;
      case "subchapter":
        return <FolderOpen className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "video_audio":
        return "Video/Audio";
      case "pdf":
        return "PDF";
      case "text":
        return "Text";
      case "website_link":
        return "Website Link";
      case "zip_file":
        return "ZIP File";
      case "subchapter":
        return "Subchapter";
      default:
        return type;
    }
  };

  const filteredCourses = courses.filter((course) =>
    course.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Course detail view
  if (selectedCourse) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedCourse(null)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">{selectedCourse.name}</h1>
                <p className="text-xs text-muted-foreground">
                  {selectedCourse.description || t("training.courseDescription")}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">{t("training.courseContent")}</CardTitle>
                  <CardDescription>
                    {t("training.manageLessons")}
                  </CardDescription>
                </div>
                <Dialog
                  open={isLessonDialogOpen}
                  onOpenChange={setIsLessonDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      {t("training.addLesson")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{t("training.newLesson")}</DialogTitle>
                    </DialogHeader>
                    <Form {...lessonForm}>
                      <form
                        onSubmit={lessonForm.handleSubmit(onLessonSubmit)}
                        className="space-y-4"
                      >
                        <FormField
                          control={lessonForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("training.lessonName")} *</FormLabel>
                              <FormControl>
                                <Input placeholder={t("training.lessonName")} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />


                        <FormField
                          control={lessonForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("training.description") || "Short Description"}</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Enter a short description of the lesson..."
                                  className="resize-none"
                                  rows={3}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={lessonForm.control}
                          name="tags"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("training.tags") || "Tags"}</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. safety, introduction, basics (comma separated)" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={lessonForm.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("training.lessonType")}</FormLabel>
                              <div className="grid grid-cols-2 gap-3">
                                {[
                                  { value: "subchapter", label: t("training.unterkapitel"), icon: FolderOpen },
                                  { value: "video_audio", label: t("training.videoAudio"), icon: Video },
                                  { value: "pdf", label: t("training.pdf"), icon: FileText },
                                  { value: "text", label: t("training.text"), icon: Type },
                                  { value: "website_link", label: t("training.websiteLink"), icon: Link },
                                  { value: "zip_file", label: t("training.zipFile"), icon: FileArchive },
                                ].map((type) => (
                                  <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => field.onChange(type.value)}
                                    className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${field.value === type.value
                                      ? "border-primary bg-primary/10"
                                      : "border-border hover:border-primary/50"
                                      }`}
                                  >
                                    <type.icon className="w-6 h-6" />
                                    <span className="text-sm font-medium">
                                      {type.label}
                                    </span>
                                  </button>
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Conditional content fields based on lesson type */}
                        {lessonForm.watch("type") !== "subchapter" && (
                          <>
                            {lessonForm.watch("type") === "text" ? (
                              <FormField
                                control={lessonForm.control}
                                name="content_text"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>{t("training.textContent")}</FormLabel>
                                    <FormControl>
                                      <Textarea
                                        placeholder={t("training.enterTextContent")}
                                        {...field}
                                        rows={5}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            ) : (
                              <FormField
                                control={lessonForm.control}
                                name="content_url"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      {lessonForm.watch("type") === "video_audio" && t("training.videoLink")}
                                      {lessonForm.watch("type") === "pdf" && t("training.pdfLink")}
                                      {lessonForm.watch("type") === "website_link" && t("training.websiteLinkUrl")}
                                      {lessonForm.watch("type") === "zip_file" && t("training.zipFileLink")}
                                    </FormLabel>
                                    <FormControl>
                                      <div className="space-y-3">
                                        <div className="flex gap-2">
                                          <Input
                                            placeholder={
                                              lessonForm.watch("type") === "video_audio"
                                                ? "https://youtube.com/... or upload file"
                                                : lessonForm.watch("type") === "pdf"
                                                  ? "https://drive.google.com/... or upload file"
                                                  : lessonForm.watch("type") === "zip_file"
                                                    ? "https://drive.google.com/... or upload file"
                                                    : "https://example.com"
                                            }
                                            {...field}
                                            disabled={isUploading}
                                          />
                                          {field.value && (
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => field.onChange("")}
                                              title="Remove file/link"
                                            >
                                              <XCircle className="h-5 w-5 text-muted-foreground hover:text-destructive" />
                                            </Button>
                                          )}
                                        </div>

                                        {lessonForm.watch("type") === "video_audio" && field.value && (
                                          <div className="rounded-lg overflow-hidden border bg-black/5 aspect-video flex items-center justify-center">
                                            {field.value.includes("cloudinary") || field.value.match(/\.(mp4|webm|ogg)$/i) ? (
                                              <video
                                                src={field.value}
                                                controls
                                                className="w-full h-full object-contain"
                                              />
                                            ) : (
                                              <div className="text-muted-foreground flex flex-col items-center gap-2">
                                                <Video className="h-8 w-8" />
                                                <span className="text-sm">Video Preview</span>
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {["video_audio", "pdf", "zip_file"].includes(lessonForm.watch("type")) && !field.value && (
                                          <div
                                            className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-4 cursor-pointer"
                                            onClick={() => handleCloudinaryUpload((url) => field.onChange(url))}
                                          >
                                            <div className="p-4 rounded-full bg-primary/10 text-primary">
                                              <Upload className="h-8 w-8" />
                                            </div>
                                            <div className="text-center space-y-1">
                                              <p className="font-medium text-lg">Click to Upload File</p>
                                              <p className="text-sm text-muted-foreground">
                                                Supports Video, Audio, PDF, ZIP (Max 100MB)
                                              </p>
                                            </div>
                                            <Button type="button" variant="secondary">
                                              Open Upload Widget
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                          </>
                        )}

                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsLessonDialogOpen(false)}
                          >
                            {t("training.cancel")}
                          </Button>
                          <Button type="submit" disabled={isUploading}>
                            {isUploading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              t("training.addLesson")
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {lessons.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <GraduationCap className="w-16 h-16 text-muted-foreground/20 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground mb-1">
                    {t("training.noLessons")}
                  </p>
                  <p className="text-sm text-muted-foreground/60">
                    {t("training.noLessonsDesc")}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      onClick={() => {
                        setSelectedLesson(lesson);
                        setIsLessonDetailOpen(true);
                      }}
                      className="p-4 rounded-lg border-2 border-border hover:border-primary/50 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                            {getTypeIcon(lesson.type)}
                          </div>
                          <div>
                            <div className="font-semibold">{lesson.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {getTypeLabel(lesson.type)}
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {lesson.status === "draft" ? t("training.draft") : t("training.published")}
                        </Badge>
                        <button
                          onClick={(e) => onLessonDelete(lesson.id, lesson.name, e)}
                          className="p-2 rounded-lg bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground text-destructive transition-all opacity-0 group-hover:opacity-100"
                          title="Delete lesson"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lesson Detail Dialog - Enhanced Player */}
          <Dialog open={isLessonDetailOpen} onOpenChange={setIsLessonDetailOpen}>
            <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background">
              {selectedLesson && (
                <div className="flex flex-col max-h-[90vh] overflow-y-auto">

                  {/* Video Player Section */}
                  {selectedLesson.type === "video_audio" && selectedLesson.content_url ? (
                    <div className="w-full bg-black aspect-video relative group">
                      <video
                        src={selectedLesson.content_url}
                        controls
                        className="w-full h-full object-contain"
                        autoPlay
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-muted flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                          {getTypeIcon(selectedLesson.type)}
                        </div>
                        <h3 className="font-semibold text-lg">{selectedLesson.name}</h3>
                      </div>
                    </div>
                  )}

                  {/* Content Section */}
                  <div className="p-6 space-y-6">

                    {/* Header Info */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs font-normal">
                          {getTypeLabel(selectedLesson.type)}
                        </Badge>
                        {selectedLesson.content_data?.tags && (
                          <div className="flex gap-1">
                            {selectedLesson.content_data.tags.split(',').map((tag: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs font-normal">
                                {tag.trim()}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <h2 className="text-2xl font-bold">{selectedLesson.name}</h2>
                    </div>

                    {/* Description */}
                    {selectedLesson.content_data?.description && (
                      <div className="prose prose-sm max-w-none text-muted-foreground">
                        <p>{selectedLesson.content_data.description}</p>
                      </div>
                    )}

                    {/* Text Content (if applicable) */}
                    {selectedLesson.type === "text" && selectedLesson.content_data?.text_content && (
                      <div className="p-4 bg-muted/50 rounded-lg whitespace-pre-wrap text-sm">
                        {selectedLesson.content_data.text_content}
                      </div>
                    )}

                    {/* Resources / Links */}
                    {selectedLesson.content_url && selectedLesson.type !== "video_audio" && selectedLesson.type !== "text" && (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Link className="w-4 h-4" />
                          Resources
                        </h4>
                        <div className="flex items-center justify-between bg-muted/50 p-3 rounded-md">
                          <span className="text-sm truncate flex-1 mr-4 font-mono text-muted-foreground">
                            {selectedLesson.content_url}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(selectedLesson.content_url!, "_blank")}
                          >
                            Open Link
                          </Button>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

        </main >
      </div >
    );
  }

  // Course list view
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{t("training.title")}</h1>
              <p className="text-xs text-muted-foreground">
                {t("training.subtitle")}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{t("training.records")}</CardTitle>
                  <CardDescription>
                    {t("training.subtitle")}
                  </CardDescription>
                </div>
              </div>
              <Dialog
                open={isCourseDialogOpen}
                onOpenChange={setIsCourseDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("training.assign")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("training.createCourse")}</DialogTitle>
                  </DialogHeader>
                  <Form {...courseForm}>
                    <form
                      onSubmit={courseForm.handleSubmit(onCourseSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={courseForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("training.courseName")} *</FormLabel>
                            <FormControl>
                              <Input placeholder={t("training.courseName")} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={courseForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("training.courseDescription")} ({t("common.optional")})</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder={t("training.courseDescription")}
                                {...field}
                                rows={3}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsCourseDialogOpen(false)}
                        >
                          {t("common.cancel")}
                        </Button>
                        <Button type="submit">{t("training.createCourse")}</Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  placeholder={t("training.search")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 border-2 focus:border-primary transition-colors"
                />
              </div>
            </div>

            {filteredCourses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <GraduationCap className="w-16 h-16 text-muted-foreground/20 mb-4" />
                <p className="text-lg font-medium text-muted-foreground mb-1">
                  {t("training.noCourses")}
                </p>
                <p className="text-sm text-muted-foreground/60">
                  {t("training.noCoursesDesc")}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCourses.map((course, index) => (
                  <div
                    key={course.id}
                    className="p-6 rounded-lg border-2 border-border hover:border-primary transition-all group"
                  >
                    {/* Course Card Content */}
                    <div
                      onClick={() => {
                        setSelectedCourse(course);
                        fetchLessons(course.id);
                      }}
                      className="cursor-pointer"
                    >
                      <div className="w-full h-24 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                        <GraduationCap className="w-12 h-12 text-white" />
                      </div>
                    </div>

                    {/* Course Name and Delete Button */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <h3
                          className="font-semibold text-lg mb-2 cursor-pointer"
                          onClick={() => {
                            setSelectedCourse(course);
                            fetchLessons(course.id);
                          }}
                        >
                          {course.name}
                        </h3>
                        {course.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {course.description}
                          </p>
                        )}
                      </div>

                      {/* Delete Button - Always Visible */}
                      <button
                        onClick={(e) => onCourseDelete(course.id, course.name, e)}
                        className="p-2 rounded-lg bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground text-destructive transition-all flex-shrink-0"
                        title="Delete course"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
