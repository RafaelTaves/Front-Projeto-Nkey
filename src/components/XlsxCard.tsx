"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { postMatch } from "@/lib/api";

type Step = "idle" | "ready" | "uploading" | "processing" | "done" | "error";

export default function XlsxCard() {
  const [file, setFile] = React.useState<File | null>(null);
  const [step, setStep] = React.useState<Step>("idle");
  const [message, setMessage] = React.useState<string>("");
  const [progress, setProgress] = React.useState<number>(0);
  const [downloadUrl, setDownloadUrl] = React.useState<string | null>(null);

  // ==== CAMPOS VARIÁVEIS DE ACORDO COM TABELA DO USUÁRIo ====
  const [descCol, setDescCol] = React.useState<string>("Descrição do Material");
  const [extraNumCols, setExtraNumCols] = React.useState<string[]>(["Diâmetro", "Comprimento (m)"]);
  const [extraInput, setExtraInput] = React.useState<string>("");

  // Campos que podem ser váriaveis se necessário, mas estão fixos para melhor precisão
  const [rerankTopK, setRerankTopK] = React.useState<number>(15);
  const [crossEncoderModel, setCrossEncoderModel] = React.useState<string>("cross-encoder/ms-marco-MiniLM-L-6-v2");

  const inputRef = React.useRef<HTMLInputElement>(null);

  function onFileChange(f: File | null) {
    setDownloadUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setMessage("");
    setProgress(0);
    setStep(f ? "ready" : "idle");
    setFile(f);
  }

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;
    if (!/\.xlsx$/i.test(dropped.name)) {
      setStep("error");
      setMessage("Envie um arquivo .xlsx válido.");
      return;
    }
    onFileChange(dropped);
  };

  const handleBrowseClick = () => inputRef.current?.click();

  // ===== Handlers dos "chips" de colunas extras =====
  function addExtraFromInput() {
    const val = extraInput.trim();
    if (!val) return;
    // evitar duplicados (case-insensitive)
    const exists = extraNumCols.some((c) => c.toLowerCase() === val.toLowerCase());
    if (!exists) {
      setExtraNumCols((arr) => [...arr, val]);
    }
    setExtraInput("");
  }

  function handleExtraKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addExtraFromInput();
    } else if (e.key === "Backspace" && !extraInput) {
      // backspace remove o último chip quando input está vazio
      setExtraNumCols((arr) => arr.slice(0, -1));
    }
  }

  function removeExtra(idx: number) {
    setExtraNumCols((arr) => arr.filter((_, i) => i !== idx));
  }

  async function handleProcess() {
    if (!file) return;

    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }

    setStep("uploading");
    setMessage("Processando...");
    setProgress(15);

    try {
      const { blob } = await postMatch({
        file,
        descCol,                           
        unitCol: "",                       
        extraNumCols: extraNumCols ?? [],  
        rerankTopK: typeof rerankTopK === "number" ? rerankTopK : undefined,
        crossEncoderModel: crossEncoderModel || undefined,
      });

      setProgress(60);
      setStep("processing");
      setMessage("Processando…");

      const url = URL.createObjectURL(blob);

      setProgress(100);
      setDownloadUrl(url);
      setStep("done");
      setMessage("Pronto! Baixe o ZIP gerado.");
    } catch (err: any) {
      const apiMsg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Erro inesperado.";

      setStep("error");
      setMessage(apiMsg);
    } finally {
      setTimeout(() => {
        setProgress((p) => (p < 100 && step !== "error" ? 100 : p));
      }, 300);
    }
  }

  return (
    <div className="rounded-lg shadow">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Processar planilha (.xlsx)</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* ======= Campos de Configuração ======= */}
          <div className="grid gap-4">
            {/* Nome da coluna de descrição */}
            <div className="space-y-2">
              <Label htmlFor="desc-col">Nome da coluna de descrição</Label>
              <Input
                id="desc-col"
                placeholder='Ex.: "Descrição do Material"'
                value={descCol}
                onChange={(e) => setDescCol(e.target.value)}
                aria-describedby="desc-col-help"
              />
              <p id="desc-col-help" className="text-xs text-muted-foreground">
                Informe exatamente como está no cabeçalho da sua planilha.
              </p>
            </div>

            {/* Nomes de colunas extras (chips) */}
            <div className="space-y-2">
              <Label htmlFor="extra-cols">Nomes de colunas extras</Label>
              <div className="flex flex-wrap gap-2">
                {extraNumCols.map((c, idx) => (
                  <Badge
                    key={`${c}-${idx}`}
                    variant="secondary"
                    className="flex items-center gap-2"
                  >
                    {c}
                    <button
                      type="button"
                      className="ml-1 -mr-1 rounded px-1 outline-none ring-0 hover:bg-muted"
                      aria-label={`Remover coluna extra ${c}`}
                      onClick={() => removeExtra(idx)}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  id="extra-cols"
                  placeholder='Digite um nome de coluna e pressione Enter'
                  value={extraInput}
                  onChange={(e) => setExtraInput(e.target.value)}
                  onKeyDown={handleExtraKeyDown}
                />
                <Button type="button" variant="secondary" onClick={addExtraFromInput}>
                  Adicionar
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Use para campos numéricos/paramétricos (ex.: Diâmetro, Comprimento).
              </p>
            </div>
          </div>

          {/* ======= Dropzone ======= */}
          <div className="space-y-2">
            <Label htmlFor="file">Arquivo</Label>
            <label
              htmlFor="file"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className={cn(
                "flex h-36 cursor-pointer items-center justify-center rounded-2xl border border-dashed p-4 text-center",
                "transition hover:bg-muted",
                file ? "border-primary" : "border-muted-foreground/30"
              )}
              aria-label="Área para soltar o arquivo .xlsx"
              title="Clique ou arraste o .xlsx"
            >
              <div>
                <p className="text-sm text-muted-foreground">
                  Arraste e solte seu <strong>.xlsx</strong> aqui
                </p>
                <p className="text-xs text-muted-foreground">ou clique para selecionar</p>
                {file && (
                  <p className="mt-2 text-sm font-medium text-foreground">{file.name}</p>
                )}
              </div>
            </label>

            <input
              ref={inputRef}
              id="file"
              type="file"
              accept=".xlsx"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f && !/\.xlsx$/i.test(f.name)) {
                  setStep("error");
                  setMessage("Envie um arquivo .xlsx válido.");
                  e.currentTarget.value = "";
                  return;
                }
                onFileChange(f);
              }}
            />

            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={handleBrowseClick}>
                Escolher arquivo
              </Button>
              <Button
                type="button"
                onClick={handleProcess}
                disabled={!file || step === "uploading" || step === "processing"}
              >
                {step === "uploading" || step === "processing" ? "Processando…" : "Processar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!downloadUrl}
                asChild
                className="ml-auto"
              >
                <a href={downloadUrl ?? "#"} download="resultado.zip" aria-disabled={!downloadUrl}>
                  Baixar ZIP
                </a>
              </Button>
            </div>
          </div>

          {/* ======= Feedback ======= */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p
              className={cn(
                "text-sm",
                step === "error" ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {message || "Selecione um arquivo .xlsx para começar."}
            </p>
          </div>
        </CardContent>

        <CardFooter className="text-xs text-muted-foreground">
          Dica: deixe somente uma linha de cabeçalho; os nomes devem bater exatamente com o Excel.
        </CardFooter>
      </Card>
    </div>
  );
}
