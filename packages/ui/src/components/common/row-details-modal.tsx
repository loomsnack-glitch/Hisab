import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";

interface RowDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: Record<string, any> | null;
    title: string;
    isLoading?: boolean;
}

const RowDetailsModal = ({ isOpen, onClose, data, title, isLoading }: RowDetailsModalProps) => {
    if (!data) return;
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="lg:min-w-3xl" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div>
                    {isLoading ? <div className="flex items-center justify-center">
                        <div className="mr-2 border-t-2 border-b-2 rounded-full animate-spin animate-infinite h-5 w-5"></div>
                        <div className="text-gray-600 text-sm">Loading...</div>
                    </div> :

                        <div className="flex flex-wrap gap-2">
                            {Object.entries(data).map(([key, value]) => {
                                let displayValue = value;
                                if (typeof value === 'object' && value !== null) {
                                    displayValue = JSON.stringify(value, null, 2);
                                }
                                if (typeof value === 'boolean') {
                                    displayValue = value ? 'true' : 'false';
                                }
                                return (
                                    <div className="w-full p-2 bg-muted rounded-sm hover:bg-muted-foreground/50" key={key}>
                                        <div className="flex gap-2">
                                            <div className="font-semibold text-sm whitespace-nowrap">
                                                {key} :
                                            </div>
                                            <div className="text-sm break-all">
                                                {displayValue}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>}
                </div>


            </DialogContent>

        </Dialog>
    )
}

export default RowDetailsModal