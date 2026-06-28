import { useState, useEffect } from 'react';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { getMyEntries, uploadBill } from '../../services/api';
import { Navbar } from '../../components/layout/Navbar';
import { BottomNav } from '../../components/layout/BottomNav';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Spinner } from '../../components/common/Spinner';
import { useContext } from 'react';
import { ToastContext } from '../../contexts/ToastContext';

export const EntryHistoryPage = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [billAmount, setBillAmount] = useState('');
  const [billImage, setBillImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const toast = useContext(ToastContext);

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        setLoading(true);
        const res = await getMyEntries();
        setEntries(res.data);
      } catch (err) {
        console.error('Failed to fetch entries:', err);
        toast?.showError('Failed to load entries');
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, []);

  const handleBillUpload = async () => {
    if (!billImage || !billAmount) {
      toast?.showError('Please select an image and enter amount');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('image', billImage);
      formData.append('amount', billAmount);

      await uploadBill(selectedEntry._id, formData);
      toast?.showSuccess('Bill uploaded successfully');

      setEntries(entries.map(e =>
        e._id === selectedEntry._id
          ? { ...e, bills: [...(e.bills || []), { amount: billAmount, status: 'pending' }] }
          : e
      ));

      setSelectedEntry(null);
      setBillAmount('');
      setBillImage(null);
    } catch (err) {
      console.error('Failed to upload bill:', err);
      toast?.showError('Failed to upload bill');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20 md:pb-0">
      <Navbar />

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-display font-bold text-gray-900 mb-2">
            Entry History
          </h1>
          <p className="text-gray-600">
            View all your venue check-ins and upload bills for cashback
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No check-ins yet</p>
            <p className="text-sm text-gray-500">
              Visit a venue and scan your membership card to get started
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <div key={entry._id} className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {entry.venueId?.name || 'Unknown Venue'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {new Date(entry.scannedAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="success">Checked In</Badge>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Bills</p>
                  {entry.bills && entry.bills.length > 0 ? (
                    <div className="space-y-2">
                      {entry.bills.map((bill, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              ₹{bill.amount}
                            </p>
                            <Badge
                              variant={
                                bill.status === 'approved'
                                  ? 'success'
                                  : bill.status === 'rejected'
                                    ? 'danger'
                                    : 'warning'
                              }
                            >
                              {bill.status}
                            </Badge>
                          </div>
                          {bill.status === 'approved' && (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No bills uploaded yet</p>
                  )}
                </div>

                <Button
                  onClick={() => setSelectedEntry(entry)}
                  variant="primary"
                  size="sm"
                >
                  <Upload className="w-4 h-4" />
                  Upload Bill
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        title="Upload Bill"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Upload your receipt for {selectedEntry?.venueId?.name}
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bill Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setBillImage(e.target.files[0])}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg"
              disabled={uploading}
            />
          </div>

          <Input
            label="Amount (₹)"
            type="number"
            value={billAmount}
            onChange={(e) => setBillAmount(e.target.value)}
            placeholder="0"
            disabled={uploading}
          />

          <div className="flex gap-3">
            <Button
              onClick={() => setSelectedEntry(null)}
              variant="secondary"
              size="md"
              className="flex-1"
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBillUpload}
              variant="primary"
              size="md"
              className="flex-1"
              disabled={uploading || !billImage || !billAmount}
            >
              {uploading ? <Spinner size="sm" /> : 'Upload Bill'}
            </Button>
          </div>
        </div>
      </Modal>

      <BottomNav />
    </div>
  );
};
