import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Documents() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-2xl w-full p-8">
        <h1 className="text-2xl font-semibold mb-2">Documents</h1>
        <p className="text-muted-foreground mb-6">
          Documents will appear here soon.
        </p>
        <div>
          <Button onClick={() => navigate(-1)} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
