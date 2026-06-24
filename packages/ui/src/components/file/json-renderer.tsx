import { useState, useRef, useEffect, useMemo, useCallback, createContext, useContext } from "react"
import { Button } from "@repo/ui/components/button"
import { Input } from "@repo/ui/components/input"
import { Card, CardContent, CardFooter, CardHeader } from "@repo/ui/components/card"
import { Badge } from "@repo/ui/components/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@repo/ui/components/tooltip"
import {
    ChevronRight,
    ChevronDown, Download,
    RefreshCw,
    Search,
    X,
    Eye,
    Code,
    Maximize2,
    Minimize2,
    Info
} from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import CopyToClipboard from "@repo/ui/components/copy-to-clipboard"

// Type Definitions
type JsonValue = string | number | boolean | null | JsonObject | JsonArray
interface JsonObject {
    [key: string]: JsonValue
}
interface JsonArray extends Array<JsonValue> { }

type ThemeType = "light" | "dark"
type ViewModeType = "tree" | "raw"
type PathType = (string | number)[]

interface JsonViewerContextType {
    isExpanded: (path: PathType) => boolean
    toggle: (path: PathType) => void
    searchQuery: string
    setSearchQuery: (query: string) => void
    expandAll: () => void
    collapseAll: () => void
    theme: ThemeType
    setTheme: (theme: ThemeType) => void
    highlightedPaths: Set<string>
    setPath: (path: PathType) => void
    currentPath: string
    viewMode: ViewModeType
    setViewMode: (mode: ViewModeType) => void
}

const JsonViewerContext = createContext<JsonViewerContextType>({
    isExpanded: () => false,
    toggle: () => { },
    searchQuery: "",
    setSearchQuery: () => { },
    expandAll: () => { },
    collapseAll: () => { },
    theme: "light",
    setTheme: () => { },
    highlightedPaths: new Set(),
    setPath: () => { },
    currentPath: "",
    viewMode: "tree",
    setViewMode: () => { },
})

// --- Theme Configuration ---
const themes = {
    light: {
        background: "bg-white",
        border: "border-gray-300",
        text: "text-gray-900",
        hover: "hover:bg-gray-100",
        string: "text-green-700",
        number: "text-blue-700",
        boolean: "text-purple-700",
        null: "text-gray-500",
        key: "text-red-800",
        highlight: "bg-yellow-200",
        path: "bg-blue-200/30",
    },
    dark: {
        background: "bg-gray-900",
        border: "border-gray-700",
        text: "text-gray-200",
        hover: "hover:bg-gray-700",
        string: "text-green-400",
        number: "text-blue-400",
        boolean: "text-purple-400",
        null: "text-gray-400",
        key: "text-red-400",
        highlight: "bg-yellow-700/40",
        path: "bg-blue-900/20",
    },
}

// --- Helper Components ---

// Component to render primitive JSON values
interface JsonValueProps {
    data: JsonValue
    path: PathType
}

const JsonValue = ({ data, path }: JsonValueProps) => {
    const { searchQuery, theme, highlightedPaths, setPath } = useContext(JsonViewerContext)
    const str = String(data)
    const safeSearchQuery = typeof searchQuery === "string" ? searchQuery : ""
    const isMatching = safeSearchQuery && str.toLowerCase().includes(safeSearchQuery.toLowerCase())
    const safePath = Array.isArray(path) ? path : []
    const isHighlighted = highlightedPaths.has(JSON.stringify(safePath))
    const currentTheme = themes[theme]

    // Assign colors based on data type
    let colorClass
    if (typeof data === "string") {
        colorClass = currentTheme.string
    } else if (typeof data === "number") {
        colorClass = currentTheme.number
    } else if (typeof data === "boolean") {
        colorClass = currentTheme.boolean
    } else {
        colorClass = currentTheme.null // for null
    }

    const handleMouseEnter = () => setPath(safePath)

    return (
        <span
            className={`${isMatching ? currentTheme.highlight : ""} ${isHighlighted ? currentTheme.path : ""
                } ${colorClass} py-0.5 px-1 rounded ${currentTheme.text}`}
            onMouseEnter={handleMouseEnter}
        >
            {JSON.stringify(data)}
        </span>
    )
}

// Component to render JSON objects
interface JsonObjectProps {
    data: JsonObject
    path: PathType
}

const JsonObject = ({ data, path }: JsonObjectProps) => {
    const { isExpanded, toggle, searchQuery, theme, highlightedPaths, setPath } = useContext(JsonViewerContext)
    const safePath = Array.isArray(path) ? path : []
    const expanded = isExpanded(safePath)
    const currentTheme = themes[theme]
    const entries = Object.entries(data)
    const entriesCount = entries.length
    const isHighlighted = highlightedPaths.has(JSON.stringify(safePath))
    const safeSearchQuery = typeof searchQuery === "string" ? searchQuery : ""

    // Check if any children match the search
    const hasChildMatch =
        safeSearchQuery &&
        Object.entries(data).some(
            ([key, value]) =>
                key.toLowerCase().includes(safeSearchQuery.toLowerCase()) ||
                (typeof value === "string" && value.toLowerCase().includes(safeSearchQuery.toLowerCase())) ||
                (typeof value === "number" && String(value).includes(safeSearchQuery)),
        )

    const handleMouseEnter = () => setPath(safePath)

    return (
        <div className={`${isHighlighted ? currentTheme.path : ""} rounded`}>
            <div className="flex items-center">
                <span
                    onClick={(e) => {
                        e.stopPropagation()
                        toggle(safePath)
                    }}
                    className={`cursor-pointer mr-1 select-none ${currentTheme.text} ${hasChildMatch ? currentTheme.highlight : ""}`}
                    onMouseEnter={handleMouseEnter}
                >
                    {expanded ? <ChevronDown className="h-3.5 w-3.5 inline" /> : <ChevronRight className="h-3.5 w-3.5 inline" />}
                </span>
                <span className={currentTheme.text} onMouseEnter={handleMouseEnter}>
                    {"{"}
                    {!expanded && entriesCount > 0 && (
                        <span className="text-muted-foreground ml-1 text-xs italic opacity-75">
                            {entriesCount} {entriesCount === 1 ? "property" : "properties"}
                        </span>
                    )}
                    {!expanded && " ... "}
                </span>
            </div>

            {expanded ? (
                <div className="ml-4 border-l border-gray-300 dark:border-gray-600 border-dashed pl-2">
                    {entries.map(([key, value], index, arr) => (
                        <div key={key} className="flex items-start my-0.5">
                            <span
                                className={`${currentTheme.key} ${safeSearchQuery && key.toLowerCase().includes(safeSearchQuery.toLowerCase())
                                    ? currentTheme.highlight
                                    : ""
                                    } mr-1 select-none`}
                                onMouseEnter={() => setPath([...safePath, key])}
                            >
                                &quot;{key}&quot;
                            </span>
                            <span className={`${currentTheme.text} mr-1`}>:</span>
                            <div className="flex-grow">
                                <JsonNode data={value} path={[...safePath, key]} />
                            </div>
                            {index < arr.length - 1 && <span className={currentTheme.text}>,</span>}
                        </div>
                    ))}
                    <span className={currentTheme.text} onMouseEnter={handleMouseEnter}>
                        {"}"}
                    </span>
                </div>
            ) : (
                <span className={currentTheme.text} onMouseEnter={handleMouseEnter}>
                    {"}"}
                </span>
            )}
        </div>
    )
}

// Component to render JSON arrays
interface JsonArrayProps {
    data: JsonArray
    path: PathType
}

const JsonArray = ({ data, path }: JsonArrayProps) => {
    const { isExpanded, toggle, searchQuery, theme, highlightedPaths, setPath } = useContext(JsonViewerContext)
    const safePath = Array.isArray(path) ? path : []
    const expanded = isExpanded(safePath)
    const currentTheme = themes[theme]
    const isHighlighted = highlightedPaths.has(JSON.stringify(safePath))
    const safeSearchQuery = typeof searchQuery === "string" ? searchQuery : ""

    // Check if any children match the search
    const hasChildMatch =
        safeSearchQuery &&
        data.some(
            (item) =>
                (typeof item === "string" && item.toLowerCase().includes(safeSearchQuery.toLowerCase())) ||
                (typeof item === "number" && String(item).includes(safeSearchQuery)),
        )

    const handleMouseEnter = () => setPath(safePath)

    return (
        <div className={`${isHighlighted ? currentTheme.path : ""} rounded`}>
            <div className="flex items-center">
                <span
                    onClick={(e) => {
                        e.stopPropagation()
                        toggle(safePath)
                    }}
                    className={`cursor-pointer mr-1 select-none ${currentTheme.text} ${hasChildMatch ? currentTheme.highlight : ""}`}
                    onMouseEnter={handleMouseEnter}
                >
                    {expanded ? <ChevronDown className="h-3.5 w-3.5 inline" /> : <ChevronRight className="h-3.5 w-3.5 inline" />}
                </span>
                <span className={currentTheme.text} onMouseEnter={handleMouseEnter}>
                    {"["}
                    {!expanded && data.length > 0 && (
                        <span className="text-muted-foreground ml-1 text-xs italic opacity-75">
                            {data.length} {data.length === 1 ? "item" : "items"}
                        </span>
                    )}
                    {!expanded && " ... "}
                </span>
            </div>

            {expanded ? (
                <div className="ml-4 border-l border-gray-300 dark:border-gray-600 border-dashed pl-2">
                    {data.map((item, index, arr) => (
                        <div key={index} className="flex items-start my-0.5">
                            <div className="flex-grow">
                                <JsonNode data={item} path={[...safePath, index.toString()]} />
                            </div>
                            {index < arr.length - 1 && <span className={currentTheme.text}>,</span>}
                        </div>
                    ))}
                    <span className={currentTheme.text} onMouseEnter={handleMouseEnter}>
                        {"]"}
                    </span>
                </div>
            ) : (
                <span className={currentTheme.text} onMouseEnter={handleMouseEnter}>
                    {"]"}
                </span>
            )}
        </div>
    )
}

// Recursive component to determine the type of JSON data and render appropriately
interface JsonNodeProps {
    data: JsonValue
    path: PathType
}

const JsonNode = ({ data, path }: JsonNodeProps) => {
    if (data === null) {
        return <JsonValue data={null} path={path} />
    }
    if (typeof data === "object") {
        if (Array.isArray(data)) {
            return <JsonArray data={data} path={path} />
        } else {
            return <JsonObject data={data} path={path} />
        }
    } else {
        return <JsonValue data={data} path={path} />
    }
}

// --- Control Components ---

const PathDisplay = () => {
    const { currentPath } = useContext(JsonViewerContext)

    return currentPath ? (
        <div className={`mt-2 flex gap-2 items-center `}>
            <span className="text-xs font-medium">Path:</span>
            <code className={`text-xs p-1 border rounded`}>{currentPath}</code>
        </div>
    ) : null
}

// Component for detailed controls toolbar
const JsonControls = () => {
    const { expandAll, collapseAll, searchQuery, setSearchQuery, theme, setTheme, viewMode, setViewMode } =
        useContext(JsonViewerContext)

    return (
        <div
            className={`mb-4 p-3 rounded border flex flex-col sm:flex-row flex-wrap gap-3 items-center`}
        >
            {/* Search Input */}
            <div className="flex items-center gap-2 flex-grow w-full sm:w-auto">
                <div className="relative flex-grow">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search in JSON..."
                        className="pl-8 pr-24"
                        value={searchQuery || ""}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <div className="absolute right-2 top-2 flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setSearchQuery("")}>
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap justify-center">
                <Button variant="outline" size="sm" onClick={expandAll}>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Expand All
                </Button>
                <Button variant="outline" size="sm" onClick={collapseAll}>
                    <ChevronRight className="h-4 w-4 mr-1" />
                    Collapse All
                </Button>
                <Button
                    variant={viewMode === "tree" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("tree")}
                    className="px-2"
                >
                    <Eye className="h-4 w-4 mr-1" />
                    Tree
                </Button>
                <Button
                    variant={viewMode === "raw" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("raw")}
                    className="px-2"
                >
                    <Code className="h-4 w-4 mr-1" />
                    Raw
                </Button>
                <Button variant="outline" size="sm" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
                    {theme === "light" ? "Dark Mode" : "Light Mode"}
                </Button>
            </div>
        </div>
    )
}

// Filter bar component to filter displayed keys
interface FilterBarProps {
    availableKeys: string[]
    activeFilters: string[]
    setActiveFilters: React.Dispatch<React.SetStateAction<string[]>>
}

const FilterBar = ({
    availableKeys,
    activeFilters,
    setActiveFilters,
}: FilterBarProps) => {
    const toggleFilter = (key: string) => {
        setActiveFilters((prev) => {
            const currentFilters = Array.isArray(prev) ? prev : []
            if (currentFilters.includes(key)) {
                return currentFilters.filter((k) => k !== key)
            } else {
                return [...currentFilters, key]
            }
        })
    }

    // Ensure availableKeys is an array
    const keysToDisplay = Array.isArray(availableKeys) ? availableKeys : []

    return keysToDisplay.length > 0 ? (
        <div className={`mb-4 p-3 border rounded`}>
            <div className={`text-sm mb-2 font-medium `}>Filter by top-level keys:</div>
            <div className="flex flex-wrap gap-2">
                {keysToDisplay.map((key) => (
                    <Button
                        key={key}
                        variant={activeFilters.includes(key) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleFilter(key)}
                        className="h-7 px-2 text-xs"
                    >
                        {key}
                    </Button>
                ))}
                {activeFilters.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setActiveFilters([])} className="h-7 px-2 text-xs">
                        Clear Filters
                    </Button>
                )}
            </div>
        </div>
    ) : null
}

// Stats component to show information about the JSON structure
interface JsonStatsProps {
    data: JsonValue
}

const JsonStats = ({ data }: JsonStatsProps) => {
    const [isOpen, setIsOpen] = useState(false)

    // Memoize stats calculation
    const stats = useMemo(() => {
        let size = 0,
            depth = 0,
            objectCount = 0,
            arrayCount = 0,
            stringCount = 0,
            numberCount = 0,
            booleanCount = 0,
            nullCount = 0

        try {
            const jsonString = JSON.stringify(data)
            size = new Blob([jsonString]).size

            const calculateStatsRecursive = (obj: JsonValue, currentDepth = 0) => {
                let maxDepth = currentDepth
                const statsResult = { objects: 0, arrays: 0, strings: 0, numbers: 0, booleans: 0, nulls: 0 }

                if (obj === null) {
                    statsResult.nulls++
                } else if (Array.isArray(obj)) {
                    statsResult.arrays++
                    obj.forEach((item) => {
                        const childStats = calculateStatsRecursive(item, currentDepth + 1)
                        maxDepth = Math.max(maxDepth, childStats.maxDepth)
                        statsResult.objects += childStats.stats.objects
                        statsResult.arrays += childStats.stats.arrays
                        statsResult.strings += childStats.stats.strings
                        statsResult.numbers += childStats.stats.numbers
                        statsResult.booleans += childStats.stats.booleans
                        statsResult.nulls += childStats.stats.nulls
                    })
                } else if (typeof obj === "object") {
                    statsResult.objects++
                    Object.values(obj).forEach((value) => {
                        const childStats = calculateStatsRecursive(value, currentDepth + 1)
                        maxDepth = Math.max(maxDepth, childStats.maxDepth)
                        statsResult.objects += childStats.stats.objects
                        statsResult.arrays += childStats.stats.arrays
                        statsResult.strings += childStats.stats.strings
                        statsResult.numbers += childStats.stats.numbers
                        statsResult.booleans += childStats.stats.booleans
                        statsResult.nulls += childStats.stats.nulls
                    })
                } else if (typeof obj === "string") {
                    statsResult.strings++
                } else if (typeof obj === "number") {
                    statsResult.numbers++
                } else if (typeof obj === "boolean") {
                    statsResult.booleans++
                }

                return { maxDepth, stats: statsResult }
            }

            const finalStats = calculateStatsRecursive(data)
            depth = finalStats.maxDepth
            objectCount = finalStats.stats.objects
            arrayCount = finalStats.stats.arrays
            stringCount = finalStats.stats.strings
            numberCount = finalStats.stats.numbers
            booleanCount = finalStats.stats.booleans
            nullCount = finalStats.stats.nulls
        } catch (error) {
            console.error("Error calculating JSON stats:", error)
            return { error: (error as Error).message }
        }

        return { size, depth, objectCount, arrayCount, stringCount, numberCount, booleanCount, nullCount }
    }, [data])

    // Helper to format size
    const formatSize = (bytes: number) => {
        if (bytes === undefined || isNaN(bytes)) return "N/A"
        if (bytes < 1024) return `${bytes} bytes`
        else if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
        else return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    }

    if ("error" in stats) {
        return (
            <div
                className={`mb-4 p-3 border rounded `}
            >
                Could not calculate stats: {stats.error}
            </div>
        )
    }

    return (
        <div className={`mb-4 border rounded`}>
            <div
                className={`flex justify-between items-center cursor-pointer p-3 `}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center">
                    <Info className="h-4 w-4 mr-2" />
                    <span className="font-medium text-sm">JSON Statistics</span>
                </div>
                <span
                    className="transform transition-transform duration-200"
                    style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                >
                    <ChevronDown className="h-4 w-4" />
                </span>
            </div>

            {isOpen && (
                <div
                    className={`p-3 border-t grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2 text-xs `}
                >
                    <div className="p-1">
                        <div className="font-medium text-muted-foreground">Size</div>
                        <div>{formatSize(stats.size)}</div>
                    </div>
                    <div className="p-1">
                        <div className="font-medium text-muted-foreground">Max Depth</div>
                        <div>{stats.depth ?? "N/A"}</div>
                    </div>
                    <div className="p-1">
                        <div className="font-medium text-muted-foreground">Objects</div>
                        <div>{stats.objectCount ?? "N/A"}</div>
                    </div>
                    <div className="p-1">
                        <div className="font-medium text-muted-foreground">Arrays</div>
                        <div>{stats.arrayCount ?? "N/A"}</div>
                    </div>
                    <div className="p-1">
                        <div className="font-medium text-muted-foreground">Strings</div>
                        <div>{stats.stringCount ?? "N/A"}</div>
                    </div>
                    <div className="p-1">
                        <div className="font-medium text-muted-foreground">Numbers</div>
                        <div>{stats.numberCount ?? "N/A"}</div>
                    </div>
                    <div className="p-1">
                        <div className="font-medium text-muted-foreground">Booleans</div>
                        <div>{stats.booleanCount ?? "N/A"}</div>
                    </div>
                    <div className="p-1">
                        <div className="font-medium text-muted-foreground">Nulls</div>
                        <div>{stats.nullCount ?? "N/A"}</div>
                    </div>
                </div>
            )}
        </div>
    )
}

// --- Main JsonViewer Component ---
interface JsonViewerProps {
    url?: string
    jsonData?: JsonValue | string
    initiallyExpanded?: boolean
    initialTheme?: ThemeType
}

export default function JsonViewer({
    url,
    jsonData,
    initiallyExpanded = false,
    initialTheme = "dark",
}: JsonViewerProps) {
    // State Variables
    const [parsedData, setParsedData] = useState<JsonValue | null>(null)
    const [jsonString, setJsonString] = useState<string>("")
    const [error, setError] = useState<string | null>(null)
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
    const [searchQuery, setSearchQuery] = useState<string>("")
    const [theme, setTheme] = useState<ThemeType>(initialTheme)
    const [activeFilters, setActiveFilters] = useState<string[]>([])
    const [currentPath, setCurrentPath] = useState<string>("")
    const [highlightedPaths, setHighlightedPaths] = useState<Set<string>>(new Set())
    const [topLevelKeys, setTopLevelKeys] = useState<string[]>([])
    const [viewMode, setViewMode] = useState<ViewModeType>("tree")
    const [isFullScreen, setIsFullScreen] = useState<boolean>(false)
    const [fileName, setFileName] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Process JSON data on load or change
    useEffect(() => {
        try {
            let data: JsonValue | null
            if (typeof jsonData === "string") {
                if (!jsonData.trim()) {
                    data = null
                } else {
                    data = JSON.parse(jsonData)
                }
            } else {
                data = jsonData ?? null
            }

            // Basic validation if it's not already parsed
            if (typeof jsonData === "string" && data === null && jsonData.trim().toLowerCase() !== "null") {
                if (jsonData.trim()) {
                    throw new Error("Invalid JSON format")
                }
            }

            setParsedData(data)
            setJsonString(JSON.stringify(data, null, 2))
            setError(null)

            // Extract top-level keys for filtering (only if it's a non-null object)
            if (data && typeof data === "object" && !Array.isArray(data)) {
                setTopLevelKeys(Object.keys(data))
            } else {
                setTopLevelKeys([])
            }
            setActiveFilters([])

            // Initialize expanded paths
            if (initiallyExpanded && data) {
                expandAllInternal(data, (paths) => setExpandedPaths(paths))
            } else {
                setExpandedPaths(new Set())
            }
        } catch (err: any) {
            setParsedData(null)
            setError(`Invalid JSON: ${err?.message || String(err)}`)
            setTopLevelKeys([])
            setActiveFilters([])
            setExpandedPaths(new Set())
            console.error("JSON Parsing Error:", err)
        }
    }, [jsonData, initiallyExpanded])

    // Fetch JSON from URL if provided
    useEffect(() => {
        if (url) {
            fetchJsonFromUrl(url);
        }
    }, [url]);


    // Fetch JSON from URL
    const fetchJsonFromUrl = useCallback(async (urlToFetch: string) => {
        if (!urlToFetch) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(urlToFetch);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            /* const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("The URL did not return JSON data");
            } */

            const data = await response.json() as JsonValue;
            setParsedData(data);
            setJsonString(JSON.stringify(data, null, 2));

            // Extract top-level keys for filtering
            if (data && typeof data === "object" && !Array.isArray(data)) {
                setTopLevelKeys(Object.keys(data));
            } else {
                setTopLevelKeys([]);
            }

            // Set filename from URL
            const urlObj = new URL(urlToFetch);
            const pathParts = urlObj.pathname.split('/');
            const lastPart = pathParts[pathParts.length - 1];
            setFileName(lastPart || "data.json");

            setActiveFilters([]);
            setExpandedPaths(new Set());
        } catch (err: any) {
            console.error("Error fetching JSON:", err);
            setError(`Failed to fetch JSON: ${err?.message || String(err)}`);
            setParsedData(null);
            setJsonString("");
            setTopLevelKeys([]);
            setActiveFilters([]);
            setExpandedPaths(new Set());
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Function to check if a path is expanded
    const isExpanded = useCallback(
        (path: PathType) => {
            const safePath = Array.isArray(path) ? path : []
            return expandedPaths.has(JSON.stringify(safePath))
        },
        [expandedPaths],
    )

    // Function to toggle expansion state
    const toggle = useCallback((path: PathType) => {
        const safePath = Array.isArray(path) ? path : []
        const key = JSON.stringify(safePath)
        setExpandedPaths((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(key)) {
                newSet.delete(key)
            } else {
                newSet.add(key)
            }
            return newSet
        })
    }, [])

    // Internal helper for expandAll to avoid direct state dependency in effect
    const expandAllInternal = (dataToTraverse: JsonValue | null, pathSetter: (paths: Set<string>) => void) => {
        const allPaths = new Set<string>()
        const traverse = (obj: JsonValue, path: PathType = []) => {
            if (obj === null || typeof obj !== "object") return

            const safePath = Array.isArray(path) ? path : []
            allPaths.add(JSON.stringify(safePath))

            if (Array.isArray(obj)) {
                obj.forEach((item, index) => {
                    traverse(item, [...safePath, index.toString()])
                })
            } else {
                // Object
                Object.entries(obj).forEach(([key, value]) => {
                    traverse(value, [...safePath, key])
                })
            }
        }
        if (dataToTraverse) {
            traverse(dataToTraverse)
            pathSetter(allPaths)
        }
    }

    const expandAll = useCallback(() => {
        expandAllInternal(parsedData, setExpandedPaths)
    }, [parsedData])

    const collapseAll = useCallback(() => {
        setExpandedPaths(new Set())
    }, [])

    // Convert path array to string representation (e.g., root.users[0].name)
    const formatPath = useCallback((path: PathType) => {
        if (!Array.isArray(path) || path.length === 0) return "root"

        return path.reduce<string>((acc, item, index) => {
            if (!isNaN(Number(item))) {
                // Array index
                return `${acc}[${item}]`
            } else {
                // Object key
                const itemStr = String(item)
                const isValidIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(itemStr)
                return index === 0 ? itemStr : isValidIdentifier ? `${acc}.${itemStr}` : `${acc}["${itemStr}"]`
            }
        }, "root")
    }, [])

    // Set current hover path and highlight ancestors
    const setPath = useCallback((path: PathType) => {
        const safePath = Array.isArray(path) ? path : []
        setCurrentPath(formatPath(safePath))

        // Highlight the path and all its parents
        const newHighlighted = new Set<string>()
        // Add root explicitly if path is not empty
        if (safePath.length > 0) {
            newHighlighted.add(JSON.stringify([]))
        }
        for (let i = 1; i <= safePath.length; i++) {
            newHighlighted.add(JSON.stringify(safePath.slice(0, i)))
        }
        setHighlightedPaths(newHighlighted)
    }, [formatPath])

    // Clear highlight when mouse leaves the viewer area
    const clearHighlight = useCallback(() => {
        setHighlightedPaths(new Set<string>())
        setCurrentPath("")
    }, [])


    const toggleFullScreen = useCallback(() => {
        setIsFullScreen(!isFullScreen)
    }, [isFullScreen])

    // Format JSON with specified indentation
    const formatJson = useCallback(
        (spaces: number) => {
            if (parsedData) {
                setJsonString(JSON.stringify(parsedData, null, spaces))
            }
        },
        [parsedData, setJsonString],
    )

    // Filter data based on active filters (applies to top-level keys only)
    const filteredData = useMemo(() => {
        const currentFilters = Array.isArray(activeFilters) ? activeFilters : []
        if (!parsedData || !currentFilters.length || !topLevelKeys.length) {
            return parsedData
        }

        // Only filter if data is a non-array object
        if (typeof parsedData === "object" && !Array.isArray(parsedData) && parsedData !== null) {
            const result: JsonObject = {}
            currentFilters.forEach((key) => {
                // Check if the key exists in the original data
                if (Object.prototype.hasOwnProperty.call(parsedData, key)) {
                    result[key] = (parsedData as JsonObject)[key]
                }
            })
            return result
        }

        // Return original data if it's an array or primitive
        return parsedData
    }, [parsedData, activeFilters, topLevelKeys])


    // Memoized context value to prevent unnecessary re-renders
    const contextValue: JsonViewerContextType = useMemo(
        () => ({
            isExpanded,
            toggle,
            searchQuery,
            setSearchQuery,
            expandAll,
            collapseAll,
            theme,
            setTheme,
            highlightedPaths,
            setPath,
            currentPath,
            viewMode,
            setViewMode,
        }),
        [
            isExpanded,
            toggle,
            searchQuery,
            expandAll,
            collapseAll,
            theme,
            setTheme,
            highlightedPaths,
            setPath,
            currentPath,
            viewMode,
        ],
    )


    const copyJson = useCallback(() => {
        const dataToCopy = filteredData !== null ? filteredData : parsedData
        if (dataToCopy === null || dataToCopy === undefined) return
        const jsonString = JSON.stringify(dataToCopy, null, 2)
        return jsonString
    }, [filteredData, parsedData])

    // Create download link for current JSON view
    const downloadJson = useCallback(() => {
        const dataToDownload = filteredData !== null ? filteredData : parsedData
        if (dataToDownload === null || dataToDownload === undefined) return

        const jsonString = JSON.stringify(dataToDownload, null, 2)
        const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = fileName || "data.json"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }, [filteredData, parsedData, fileName])


    // Display error message if JSON is invalid
    if (error) {
        return (
            <div className="text-red-600 p-4 border border-red-400 bg-red-100 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300 rounded shadow-md">
                <div className="font-bold mb-2">Invalid JSON Data</div>
                <div className="font-mono text-sm">{error}</div>
            </div>
        )
    }

    // Display loading message or placeholder if data is not yet parsed/available
    if (parsedData === null && !error && typeof jsonData !== "string") {
        return (
            <div
                className={`p-4 text-muted-foreground ${themes[theme].background} border ${themes[theme].border
                    } rounded`}
            >
                No JSON data provided.
            </div>
        )
    } else if (parsedData === undefined && !error) {
        return (
            <div
                className={`p-4 text-muted-foreground ${themes[theme].background} border ${themes[theme].border
                    } rounded`}
            >
                Loading JSON data...
            </div>
        )
    }

    // Get theme classes
    const currentTheme = themes[theme as keyof typeof themes]

    return (
        <div
            ref={containerRef}
            className={cn("transition-all duration-300", isFullScreen ? "fixed inset-0 z-50 bg-background p-6" : "w-full")}
        >
            <Card className="w-full h-full flex flex-col">
                <CardHeader className="flex flex-row items-center justify-end space-y-0 pb-2">
                    <div className="flex items-center gap-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger
                                    render={(
                                        <Button variant="ghost" size="icon" onClick={toggleFullScreen}>
                                            {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                                        </Button>
                                    )}
                                />
                                <TooltipContent>{isFullScreen ? "Exit Fullscreen" : "Fullscreen"}</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </CardHeader>
                <CardContent className={cn("flex-grow overflow-auto flex flex-col", isFullScreen ? "" : "max-h-[80dvh]")}>
                    <JsonViewerContext.Provider value={contextValue}>
                        <div className={`text-sm`} onMouseLeave={clearHighlight}>
                            {!parsedData ? (
                                <div className="flex items-center justify-center h-full">
                                    No JSON data provided or invalid JSON.
                                </div>
                            ) : (
                                <div className="flex flex-col h-full">
                                    <JsonControls />

                                    {topLevelKeys.length > 0 && (
                                        <FilterBar
                                            availableKeys={topLevelKeys}
                                            activeFilters={activeFilters}
                                            setActiveFilters={setActiveFilters}
                                        />
                                    )}

                                    <JsonStats data={parsedData} />

                                    {/* JSON Viewer Area */}
                                    <div
                                        className={`p-4 border ${currentTheme.background} rounded relative shadow-sm overflow-auto max-h-[70dvh]`}
                                    >
                                        {isLoading ? (
                                            <div className="flex items-center justify-center h-64">
                                                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                                            </div>
                                        ) : viewMode === "tree" ? (
                                            <div className="font-geist-mono text-sm">
                                                {filteredData !== null && filteredData !== undefined ? (
                                                    <JsonNode data={filteredData} path={[]} />
                                                ) : (
                                                    <div className="text-muted-foreground">
                                                        {activeFilters.length > 0
                                                            ? "No data matches the current filter."
                                                            : parsedData === null
                                                                ? "JSON data is null."
                                                                : "No JSON data to display."}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <pre className={`text-sm whitespace-pre-wrap ${currentTheme.text}`}>{jsonString}</pre>
                                        )}

                                        {parsedData !== null && parsedData !== undefined && (
                                            <div className="absolute top-3 right-3 flex gap-2">
                                                <CopyToClipboard getValue={() => copyJson() || ''} />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={downloadJson}
                                                    className="h-7 px-2"
                                                    title="Download current JSON view"
                                                >
                                                    <Download className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {viewMode === "raw" && (
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-sm text-muted-foreground">Format:</span>
                                            <Button variant="outline" size="sm" onClick={() => formatJson(2)} className="h-7 px-2">
                                                2 spaces
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => formatJson(4)} className="h-7 px-2">
                                                4 spaces
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => formatJson(0)} className="h-7 px-2">
                                                Compact
                                            </Button>
                                        </div>
                                    )}

                                    {/* Path display */}
                                    <PathDisplay />
                                </div>
                            )}
                        </div>
                    </JsonViewerContext.Provider>
                </CardContent>
                {parsedData && (
                    <CardFooter className="flex justify-between pt-4">
                        <div className="flex items-center">
                            <Badge variant="outline" className="mr-2">
                                {typeof parsedData === "object" && parsedData !== null
                                    ? Array.isArray(parsedData)
                                        ? `Array [${Object.keys(parsedData).length}]`
                                        : `Object {${Object.keys(parsedData).length}}`
                                    : typeof parsedData}
                            </Badge>
                            {searchQuery && (
                                <Badge variant="secondary">
                                    {searchQuery.length} {searchQuery.length === 1 ? "character" : "characters"}
                                </Badge>
                            )}
                        </div>
                    </CardFooter>
                )}
            </Card>
        </div>
    )
}
