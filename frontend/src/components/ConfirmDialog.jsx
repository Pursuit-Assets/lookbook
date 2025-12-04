import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

function ConfirmDialog({ isOpen, onClose, onConfirm, message }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <CardContent className="p-6">
          <p className="text-gray-900 mb-6 font-semibold">
            {message}
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              className="text-white"
              style={{backgroundColor: '#4242ea'}}
            >
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ConfirmDialog;

