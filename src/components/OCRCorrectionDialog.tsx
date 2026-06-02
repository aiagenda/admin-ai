import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OCRCorrectionDialogProps {
  label: string;
  extractedValue: string;
  analysisId: string;
  documentId: string;
  fieldType: "amount" | "bank_account";
}

export function OCRCorrectionDialog({
  label,
  extractedValue,
  analysisId,
  documentId,
  fieldType,
}: OCRCorrectionDialogProps) {
  const [open, setOpen] = useState(false);
  const [correctValue, setCorrectValue] = useState("");
  const [hasHandwrittenNumbers, setHasHandwrittenNumbers] = useState(false);
  const [accuracy, setAccuracy] = useState<"excellent" | "good" | "fair" | "poor">("good");
  const [comment, setComment] = useState("");

  const handleSubmit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Be kell jelentkezned");
        return;
      }

      // Determine if correction was made
      const wasCorrected = correctValue.trim() !== "" && correctValue.trim() !== extractedValue;

      // Insert OCR feedback
      const { error } = await supabase.from("ocr_feedback").insert({
        analysis_id: analysisId,
        document_id: documentId,
        user_id: user.id,
        ocr_accuracy: accuracy,
        handwritten_numbers_detected: hasHandwrittenNumbers,
        handwritten_numbers_correct: hasHandwrittenNumbers ? (wasCorrected ? false : true) : null,
        extracted_amount: fieldType === "amount" ? extractedValue : null,
        correct_amount: fieldType === "amount" && wasCorrected ? correctValue : null,
        extracted_bank_account: fieldType === "bank_account" ? extractedValue : null,
        correct_bank_account: fieldType === "bank_account" && wasCorrected ? correctValue : null,
        feedback_comment: comment.trim() || null,
      });

      if (error) throw error;

      toast.success(
        wasCorrected
          ? "Correction saved! Thank you for helping improve accuracy."
          : "Feedback saved! Thank you!"
      );

      setOpen(false);
      setCorrectValue("");
      setHasHandwrittenNumbers(false);
      setAccuracy("good");
      setComment("");
    } catch (error: any) {
      console.error("Error saving OCR feedback:", error);
      toast.error("Failed to save feedback");
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
      <div className="flex-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="font-mono">{extractedValue}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            navigator.clipboard.writeText(extractedValue);
            toast.success("Copied!");
          }}
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <Edit className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>OCR Correction – {label}</DialogTitle>
              <DialogDescription>
                If the AI misread a handwritten value, you can correct it here. This helps improve accuracy.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>AI-extracted value</Label>
                <Input value={extractedValue} disabled className="font-mono" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="correct-value">Correct value (if different)</Label>
                <Input
                  id="correct-value"
                  value={correctValue}
                  onChange={(e) => setCorrectValue(e.target.value)}
                  placeholder={extractedValue}
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="handwritten">Does the document contain handwritten numbers?</Label>
                <Select
                  value={hasHandwrittenNumbers ? "yes" : "no"}
                  onValueChange={(value) => setHasHandwrittenNumbers(value === "yes")}
                >
                  <SelectTrigger id="handwritten">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">Nem</SelectItem>
                    <SelectItem value="yes">Igen</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accuracy">Recognition accuracy</Label>
                <Select value={accuracy} onValueChange={(value: any) => setAccuracy(value)}>
                  <SelectTrigger id="accuracy">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Gyenge</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">Comment (optional)</Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Additional notes about the recognition…"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
