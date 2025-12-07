import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ArrowLeft,
  Save,
  Upload as UploadIcon,
  Video as VideoIcon,
  Settings,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import LessonTypeSelector from "@/components/training/LessonTypeSelector";
import FileUploadZone from "@/components/training/FileUploadZone";

const lessonSchema = z.object({
  name: z.string().min(1, "Lesson name is required"),
  type: z.enum(["subchapter", "video_audio", "pdf", "text", "iframe"]),
  content_url: z.string().optional(),
  content_text: z.string().optional(),
  description: z.string().optional(),
  tags: z.string().optional(),
});

type LessonFormData = z.infer<typeof lessonSchema>;

interface Lesson {
  id: string;
  course_id: string;
  name: string;
  type: "subchapter" | "video_audio" | "pdf" | "text" | "iframe";
  content_url: string | null;
  content_data: any;
  order_index: number;
  status: "draft" | "published";
  parent_id: string | null;
}

interface Course {
  id: string;
  name: string;
}

export default function LessonEditor() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const { user, loading, companyId } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const isNewLesson = lessonId === "new";

  const form = useForm<LessonFormData>({
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
    if (user && companyId && courseId) {
      fetchCourse();
      if (!isNewLesson && lessonId) {
        fetchLesson();
      } else {
        setIsLoading(false);
      }
    }
  }, [user, loading, navigate, companyId, courseId, lessonId, isNewLesson]);

  const fetchCourse = async () => {
    if (!courseId || !companyId) return;

    try {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name")
        .eq("id", courseId)
        .eq("company_id", companyId)
        .single();

      if (error) throw error;
      setCourse(data);
    } catch (err: any) {
      toast({
        title: "Error loading course",
        description: err.message,
        variant: "destructive",
      });
      navigate("/training");
    }
  };

  const fetchLesson = async () => {
    if (!lessonId || !courseId) return;

    try {
      const { data, error } = await supabase
        .from("course_lessons")
        .select("*")
        .eq("id", lessonId)
        .eq("course_id", courseId)
        .single();

      if (error) throw error;

      setLesson(data);
      form.reset({
        name: data.name,
        type: data.type,
        content_url: data.content_url || "",
        content_text: data.content_data?.text_content || "",
        description: data.content_data?.description || "",
        tags: data.content_data?.tags || "",
      });
    } catch (err: any) {
      toast({
        title: "Error loading lesson",
        description: err.message,
        variant: "destructive",
      });
      navigate(`/training`);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: LessonFormData) => {
    if (!courseId || !companyId) return;

    setIsSaving(true);
    try {
      const contentData: any = {};

      if (data.type === "text" && data.content_text) {
        contentData.text_content = data.content_text;
      }

      if (data.description) contentData.description = data.description;
      if (data.tags) contentData.tags = data.tags;

      if (isNewLesson) {
        // Get the highest order_index
        const { data: existingLessons } = await supabase
          .from("course_lessons")
          .select("order_index")
          .eq("course_id", courseId)
          .order("order_index", { ascending: false })
          .limit(1);

        const nextOrderIndex = existingLessons && existingLessons.length > 0
          ? existingLessons[0].order_index + 1
          : 0;

        const { error } = await supabase.from("course_lessons").insert([
          {
            course_id: courseId,
            name: data.name,
            type: data.type,
            content_url: data.content_url || null,
            content_data: Object.keys(contentData).length > 0 ? contentData : null,
            order_index: nextOrderIndex,
            status: "draft",
          },
        ]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Lesson created successfully",
        });
      } else {
        const { error } = await supabase
          .from("course_lessons")
          .update({
            name: data.name,
            type: data.type,
            content_url: data.content_url || null,
            content_data: Object.keys(contentData).length > 0 ? contentData : null,
          })
          .eq("id", lessonId);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Lesson updated successfully",
        });
      }

      navigate(`/training`);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header with Breadcrumb */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/training")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span
                className="hover:text-foreground cursor-pointer"
                onClick={() => navigate("/training")}
              >
                {course?.name || "Course"}
              </span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-foreground font-medium">
                {isNewLesson ? "Neue Lektion" : lesson?.name || "Lektion"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="general">Allgemein</TabsTrigger>
                <TabsTrigger value="chapters" disabled={form.watch("type") !== "subchapter"}>
                  Kapitel
                </TabsTrigger>
              </TabsList>

              {/* General Tab */}
              <TabsContent value="general" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Video/Audio Lektion</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Erfahre mehr über den Kurseditor
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Lesson Type Selector */}
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Typ</FormLabel>
                          <FormControl>
                            <LessonTypeSelector
                              value={field.value}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Lesson Name */}
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Lektionsname eingeben" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Description */}
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kurzbeschreibung</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Kurze Beschreibung der Lektion..."
                              className="resize-none"
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Tags */}
                    <FormField
                      control={form.control}
                      name="tags"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tags</FormLabel>
                          <FormControl>
                            <Input placeholder="Tag" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Content based on type */}
                    {form.watch("type") === "video_audio" && (
                      <div className="space-y-4">
                        <Label>Hinweis zu Video- und Audioformaten</Label>
                        <p className="text-sm text-muted-foreground mb-4">
                          Video & Audioformate bis zu 25GB
                        </p>

                        <FormField
                          control={form.control}
                          name="content_url"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <FileUploadZone
                                  lessonType="video_audio"
                                  currentFileUrl={field.value}
                                  onUploadComplete={field.onChange}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex gap-2">
                          <Button type="button" variant="outline" className="flex-1">
                            <VideoIcon className="w-4 h-4 mr-2" />
                            Video aufnehmen
                          </Button>
                          <Button type="button" variant="outline" className="flex-1">
                            <UploadIcon className="w-4 h-4 mr-2" />
                            Video importieren
                          </Button>
                        </div>
                      </div>
                    )}

                    {form.watch("type") === "pdf" && (
                      <FormField
                        control={form.control}
                        name="content_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>PDF Upload</FormLabel>
                            <FormControl>
                              <FileUploadZone
                                lessonType="pdf"
                                currentFileUrl={field.value}
                                onUploadComplete={field.onChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {form.watch("type") === "text" && (
                      <FormField
                        control={form.control}
                        name="content_text"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Text Content</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Enter your text content here..."
                                {...field}
                                rows={10}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {form.watch("type") === "iframe" && (
                      <FormField
                        control={form.control}
                        name="content_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>iFrame URL</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://example.com"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* Save Button */}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/training")}
                  >
                    Abbrechen
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Save className="w-4 h-4 mr-2 animate-spin" />
                        Speichern...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Speichern
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              {/* Chapters Tab */}
              <TabsContent value="chapters" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Kapitel verwalten</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Fügen Sie Lektionen zu diesem Unterkapitel hinzu
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12 text-muted-foreground">
                      <Settings className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>Kapitel-Verwaltung wird in Kürze verfügbar sein</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </form>
        </Form>
      </main>
    </div>
  );
}
