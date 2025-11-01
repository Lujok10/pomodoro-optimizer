"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function TaskButtons() {
  const { toast } = useToast();

  return (
    <div className="flex gap-2">
      <Button
        onClick={() =>
          toast({
            title: "Task Started",
            description: "Good luck! Stay focused 🚀",
            duration: 3000,
          })
        }
      >
        Start Task
      </Button>

      <Button
        onClick={() =>
          toast({
            title: "Task Completed",
            description: "Great job! Task has been logged ✅",
            duration: 3000,
          })
        }
      >
        Complete Task
      </Button>
    </div>
  );
}

