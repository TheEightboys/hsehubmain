import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  FileDown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function AuditDetails() {
  const { id } = useParams();
  const { user, loading, companyId } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [audit, setAudit] = useState<any>(null);
  const [checklistItems, setChecklistItems] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (user && companyId && id) {
      fetchAuditDetails();
    }
  }, [user, loading, navigate, companyId, id]);

  const fetchAuditDetails = async () => {
    if (!companyId || !id) return;

    setLoadingData(true);
    try {
      // Fetch audit
      const { data: auditData, error: auditError } = await supabase
        .from("audits")
        .select(`
          *,
          audit_categories(name),
          departments(name),
          employees!audits_responsible_person_id_fkey(full_name)
        `)
        .eq("id", id)
        .eq("company_id", companyId)
        .single();

      if (auditError) throw auditError;
      setAudit(auditData);

      // Fetch checklist items with ISO criteria
      const { data: itemsData, error: itemsError } = await supabase
        .from("audit_checklist_items")
        .select(`
          *,
          iso_criteria_sections(section_number, title, title_en),
          iso_criteria_subsections(subsection_number, title, title_en),
          iso_criteria_questions(question_text, question_text_en)
        `)
        .eq("audit_id", id)
        .order("section_id");

      if (itemsError) throw itemsError;
      setChecklistItems(itemsData || []);
    } catch (err: any) {
      toast({
        title: "Error loading audit",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const updateChecklistItem = async (itemId: string, updates: any) => {
    try {
      const { error } = await supabase
        .from("audit_checklist_items")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", itemId);

      if (error) throw error;

      // Update local state
      setChecklistItems(items =>
        items.map(item =>
          item.id === itemId ? { ...item, ...updates } : item
        )
      );

      // Refresh audit to get updated progress
      fetchAuditDetails();
    } catch (err: any) {
      toast({
        title: "Error updating item",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: t("audits.status.pending"), variant: "outline" as const, color: "text-gray-600" },
      completed: { label: t("audits.status.completed"), variant: "default" as const, color: "text-green-600" },
      failed: { label: t("audits.status.failed"), variant: "destructive" as const, color: "text-red-600" },
      not_applicable: { label: t("audits.status.notApplicable"), variant: "secondary" as const, color: "text-gray-500" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Audit not found</p>
      </div>
    );
  }

  // Group checklist items by section
  const groupedItems = checklistItems.reduce((acc, item) => {
    const sectionKey = item.section_id || "other";
    if (!acc[sectionKey]) {
      acc[sectionKey] = {
        section: item.iso_criteria_sections,
        items: [],
      };
    }
    acc[sectionKey].items.push(item);
    return acc;
  }, {} as Record<string, any>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/audits")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{audit.title}</h1>
              <p className="text-xs text-muted-foreground">
                {audit.iso_code} - {audit.scheduled_date}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <FileDown className="w-4 h-4 mr-2" />
              {t("audits.pdfExport")}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Audit Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{audit.title}</CardTitle>
                <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                  <span>📋 {audit.iso_code}</span>
                  <span>📅 {audit.scheduled_date}</span>
                  <span>👤 {audit.employees?.full_name || t("audits.notAssigned")}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {audit.progress_percentage || 0}%
                </div>
                <div className="text-sm text-muted-foreground">
                  ({audit.completed_items || 0}/{audit.total_items || 0})
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>{t("audits.checklist")} ({checklistItems.length} {t("audits.checklistItems")})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(groupedItems).map(([sectionKey, group]: [string, any]) => (
              <div key={sectionKey} className="space-y-3">
                <h3 className="font-semibold text-lg">
                  {group.section?.section_number}. {language === 'en' ? group.section?.title_en : group.section?.title}
                </h3>
                
                {group.items.map((item: any, idx: number) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">
                          {item.iso_criteria_subsections?.subsection_number} - {language === 'en' ? item.iso_criteria_subsections?.title_en : item.iso_criteria_subsections?.title}
                        </div>
                        {item.iso_criteria_questions && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {language === 'en' ? item.iso_criteria_questions?.question_text_en : item.iso_criteria_questions?.question_text}
                          </div>
                        )}
                      </div>
                      {getStatusBadge(item.status)}
                    </div>

                    {/* Status Buttons */}
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant={item.status === 'pending' ? 'default' : 'outline'}
                        onClick={() => updateChecklistItem(item.id, { status: 'pending' })}
                      >
                        {t("audits.status.pending")}
                      </Button>
                      <Button
                        size="sm"
                        variant={item.status === 'completed' ? 'default' : 'outline'}
                        onClick={() => updateChecklistItem(item.id, { status: 'completed' })}
                      >
                        {t("audits.status.completed")}
                      </Button>
                      <Button
                        size="sm"
                        variant={item.status === 'failed' ? 'destructive' : 'outline'}
                        onClick={() => updateChecklistItem(item.id, { status: 'failed' })}
                      >
                        {t("audits.status.failed")}
                      </Button>
                      <Button
                        size="sm"
                        variant={item.status === 'not_applicable' ? 'secondary' : 'outline'}
                        onClick={() => updateChecklistItem(item.id, { status: 'not_applicable' })}
                      >
                        {t("audits.status.notApplicable")}
                      </Button>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="text-sm font-medium">{t("audits.notes")}</label>
                      <Textarea
                        value={item.notes || ''}
                        onChange={(e) => updateChecklistItem(item.id, { notes: e.target.value })}
                        placeholder={t("audits.notesPlaceholder")}
                        rows={2}
                        className="mt-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
