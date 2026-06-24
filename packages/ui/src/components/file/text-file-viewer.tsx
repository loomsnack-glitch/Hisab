import { useEffect, useState } from "react"
import { Card, CardContent } from "@repo/ui/components/card"
import { FileText } from "lucide-react"
import { ScrollArea } from "@repo/ui/components/scroll-area"
import CopyToClipboard from "@repo/ui/components/copy-to-clipboard"

interface TextFileViewerProps {
    content?: string;
    url: string;
}

export default function TextFileViewer({
    content: initialContent,
    url,
}: TextFileViewerProps) {
    const [content, setContent] = useState(initialContent || "")
    const [error, setError] = useState(null)

    useEffect(() => {
        if (url) {
            fetch(url)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error("Failed to fetch content")
                    }
                    return response.text()
                })
                .then((data) => {
                    setContent(data)
                })
                .catch((err) => {
                    setError(err.message)
                })
        }
    }, [url])

    return (
        <Card className="w-full max-w-4xl mx-auto p-0">
            <CardContent className="p-0">
                {error ? (
                    <div className="text-red-500">{error}</div>
                ) : content ? (
                    <div className="relative">
                        <CopyToClipboard
                            getValue={() => content}
                            className="absolute top-2 right-2 z-10"
                            variant="outline"
                        />
                        <ScrollArea className="h-[calc(100dvh-10dvh)]">
                            <div className="rounded-lg overflow-hidden bg-muted/30">
                                <div className="flex text-sm font-mono">
                                    <div className="bg-muted text-muted-foreground p-4 text-right select-none w-12">
                                        {content.split("\n").map((_, i) => (
                                            <div key={i} className="leading-relaxed">
                                                {i + 1}
                                            </div>
                                        ))}
                                    </div>
                                    <pre className="p-4 overflow-auto w-full">
                                        <code className="text-sm leading-relaxed">{content}</code>
                                    </pre>
                                </div>
                            </div>
                        </ScrollArea>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 text-center min-h-[200px]">
                        <FileText className="h-10 w-10 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">No content loaded</p>
                        <p className="text-sm text-muted-foreground">Provide text content via props or a valid URL.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
