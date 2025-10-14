import { BookOpen } from "lucide-react"

export function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="flex h-16 items-center px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Story Book Generator</h1>
            <p className="text-xs text-muted-foreground">Create professional DOCX files</p>
          </div>
        </div>
      </div>
    </header>
  )
}
