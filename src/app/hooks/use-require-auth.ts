"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { verifySession } from "@/lib/api";

export function useRequireAuth() {
  const router = useRouter();
  const [checking, setChecking] = React.useState(true);
  const [isAuthed, setIsAuthed] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const ok = await verifySession();
      if (!mounted) return;

      if (!ok) {
        router.replace("/"); // volta pro login
        setIsAuthed(false);
      } else {
        setIsAuthed(true);
      }
      setChecking(false);
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  return { checking, isAuthed };
}
