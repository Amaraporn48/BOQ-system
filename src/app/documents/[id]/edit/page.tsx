'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { calculateDocumentTotals } from '@/lib/calculations';
import {
  FileText,
  Plus,
  Trash2,
  Copy,
  Layers,
  Save,
  Building,
  FolderKanban,
  MapPin,
  Calendar,
  Sparkles,
  ArrowLeft,
  X,
  AlertTriangle,
  Upload,
  Camera,
  Image as ImageIcon,
  PenTool,
  FileSpreadsheet,
  Paperclip,
  FileDown,
  ExternalLink,
  Coins,
} from 'lucide-react';
import Link from 'next/link';
import { SignaturePadModal } from '@/components/SignaturePadModal';
import { ExcelImportModal } from '@/components/ExcelImportModal';
import { AiExtractModal } from '@/components/AiExtractModal';

interface BoqItemInput {
  id?: string;
  itemNo: number;
  description: string;
  specification: string;
  unit: string;
  quantity: number;
  materialPrice?: number;
  materialAmount?: number;
  laborPrice?: number;
  laborAmount?: number;
  unitPrice: number;
  amount: number;
  notes: string;
}

interface CategoryInput {
  name: string;
  items: BoqItemInput[];
}

export default function EditDocumentPage() {
  const { id } = useParams() as { id: string };
  const { user, loading } = useAuth();
  const router = useRouter();

  const [document, setDocument] = useState<any>(null);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Form states
  const [documentNumber, setDocumentNumber] = useState('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [documentDate, setDocumentDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [preparedBy, setPreparedBy] = useState('');
  const [preparedSignatureUrl, setPreparedSignatureUrl] = useState('');
  const [preparedDate, setPreparedDate] = useState('');

  const [checkedBy, setCheckedBy] = useState('');
  const [checkedSignatureUrl, setCheckedSignatureUrl] = useState('');
  const [checkedDate, setCheckedDate] = useState('');

  const [approvedBy, setApprovedBy] = useState('');
  const [approvedSignatureUrl, setApprovedSignatureUrl] = useState('');
  const [approvedDate, setApprovedDate] = useState('');

  const [clientSignerName, setClientSignerName] = useState('');
  const [clientSignatureUrl, setClientSignatureUrl] = useState('');
  const [clientSignedDate, setClientSignedDate] = useState('');

  const [signModalConfig, setSignModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    onSave: (url: string) => void;
  }>({
    isOpen: false,
    title: '',
    onSave: () => {},
  });

  const handleUploadSignature = async (
    file: File,
    onSuccess: (url: string) => void
  ) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        onSuccess(data.url);
      } else {
        alert(data.error || 'อัปโหลดรูปลายเซ็นไม่สำเร็จ');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการอัปโหลดรูปลายเซ็น');
    }
  };

  // Project, Customer, Location
  const [projects, setProjects] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [isProjectJob, setIsProjectJob] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectCode, setNewProjectCode] = useState('');
  const [savingProject, setSavingProject] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerTaxId, setCustomerTaxId] = useState('');
  const [workingLocation, setWorkingLocation] = useState('');
  const [attnName, setAttnName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [sitePhotoUrl, setSitePhotoUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [overheadRate, setOverheadRate] = useState(10.0);

  // File Attachment State (PDF, Excel, Scan, etc.)
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentSize, setAttachmentSize] = useState<number | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [creationMode, setCreationMode] = useState<'attachment' | 'table'>('table');
  const [attachmentGrandTotal, setAttachmentGrandTotal] = useState<number | ''>('');

  // Excel Import Modal State
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  const handleApplyAiData = (data: {
    categories: any[];
    title?: string;
    customerName?: string;
    workingLocation?: string;
    notes?: string;
  }) => {
    if (data.categories && data.categories.length > 0) {
      setCategories(data.categories);
      setCreationMode('table');
    }
    if (data.title && (!title || title === 'งานปรับปรุง / ติดตั้งระบบ')) {
      setTitle(data.title);
    }
    if (data.customerName && !customerName) {
      setCustomerName(data.customerName);
    }
    if (data.workingLocation && !workingLocation) {
      setWorkingLocation(data.workingLocation);
    }
    if (data.notes && !notes) {
      setNotes(data.notes);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setSitePhotoUrl(data.url);
      } else {
        alert(data.error || 'อัปโหลดรูปภาพล้มเหลว');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setAttachmentUrl(data.url);
        setAttachmentName(data.name || file.name);
        setAttachmentSize(data.size || file.size);
        setCreationMode('attachment');
      } else {
        alert(data.error || 'อัปโหลดไฟล์ไม่สำเร็จ');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการอัปโหลดไฟล์');
    } finally {
      setUploadingAttachment(false);
      e.target.value = '';
    }
  };

  // Commercial terms
  const [paymentTerms, setPaymentTerms] = useState('');
  const [executionDuration, setExecutionDuration] = useState('');
  const [warrantyDuration, setWarrantyDuration] = useState('');
  const [notes, setNotes] = useState('');

  // VAT & Pricing
  const [vatRate, setVatRate] = useState(7.0);
  const [isVatIncluded, setIsVatIncluded] = useState(false);
  const [discountType, setDiscountType] = useState<'PERCENT' | 'AMOUNT'>('PERCENT');
  const [discountValue, setDiscountValue] = useState(0);

  // Categories & Items
  const [categories, setCategories] = useState<CategoryInput[]>([]);

  // Modals
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationAddress, setNewLocationAddress] = useState('');
  const [newLocationNotes, setNewLocationNotes] = useState('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const fetchDocument = async () => {
    setFetching(true);
    try {
      const res = await fetch(`/api/documents/${id}`);
      if (res.ok) {
        const data = await res.json();
        const doc = data.document;
        setDocument(doc);

        setDocumentNumber(doc.documentNumber || '');
        setTitle(doc.title);
        setStatus(doc.status);
        setSelectedProjectId(doc.projectId || '');
        setIsProjectJob(!!doc.projectId);
        setSelectedCustomerId(doc.customerId || '');
        setSelectedLocationId(doc.locationId || '');
        setCustomerName(doc.customerName || doc.customer?.name || '');
        setCustomerAddress(doc.customerAddress || doc.customer?.address || '');
        setCustomerTaxId(doc.customerTaxId || doc.customer?.taxId || '');
        setWorkingLocation(doc.workingLocation || doc.location?.name || '');
        setAttnName(doc.attnName || '');
        setContactPerson(doc.contactPerson || '');
        setContactPhone(doc.contactPhone || '');

        const rev = doc.revisions?.[0]; // latest revision
        if (rev) {
          if (rev.attnName) setAttnName(rev.attnName);
          if (rev.contactPerson) setContactPerson(rev.contactPerson);
          if (rev.contactPhone) setContactPhone(rev.contactPhone);
          if (rev.sitePhotoUrl) setSitePhotoUrl(rev.sitePhotoUrl);
          if (rev.attachmentUrl) setAttachmentUrl(rev.attachmentUrl);
          if (rev.attachmentName) setAttachmentName(rev.attachmentName);
          if (rev.attachmentSize) setAttachmentSize(rev.attachmentSize);
          if (rev.overheadRate !== undefined) setOverheadRate(rev.overheadRate);

          setDocumentDate(new Date(rev.documentDate).toISOString().slice(0, 10));
          setExpiryDate(
            rev.expiryDate ? new Date(rev.expiryDate).toISOString().slice(0, 10) : ''
          );
          setPreparedBy(rev.preparedBy || '');
          setPreparedSignatureUrl(rev.preparedSignatureUrl || '');
          setPreparedDate(
            rev.preparedDate
              ? new Date(rev.preparedDate).toISOString().slice(0, 10)
              : new Date(rev.documentDate).toISOString().slice(0, 10)
          );

          setCheckedBy(rev.checkedBy || '');
          setCheckedSignatureUrl(rev.checkedSignatureUrl || '');
          setCheckedDate(
            rev.checkedDate ? new Date(rev.checkedDate).toISOString().slice(0, 10) : ''
          );

          setApprovedBy(rev.approvedBy || '');
          setApprovedSignatureUrl(rev.approvedSignatureUrl || '');
          setApprovedDate(
            rev.approvedDate
              ? new Date(rev.approvedDate).toISOString().slice(0, 10)
              : new Date(rev.documentDate).toISOString().slice(0, 10)
          );

          setClientSignerName(rev.clientSignerName || '');
          setClientSignatureUrl(rev.clientSignatureUrl || '');
          setClientSignedDate(
            rev.clientSignedDate ? new Date(rev.clientSignedDate).toISOString().slice(0, 10) : ''
          );
          setPaymentTerms(rev.paymentTerms || '');
          setExecutionDuration(rev.executionDuration || '');
          setWarrantyDuration(rev.warrantyDuration || '');
          setNotes(rev.notes || '');
          setVatRate(rev.vatRate);
          setIsVatIncluded(rev.isVatIncluded);
          setDiscountType(rev.discountType as any);
          setDiscountValue(rev.discountValue);

          const formattedCats = (rev.categories || []).map((c: any) => ({
            name: c.name,
            items: (c.items || []).map((it: any) => ({
              id: it.id,
              itemNo: it.itemNo,
              description: it.description,
              specification: it.specification || '',
              unit: it.unit || 'JOB',
              quantity: it.quantity,
              materialPrice: it.materialPrice || 0,
              materialAmount: it.materialAmount !== undefined ? it.materialAmount : ((it.quantity || 1) * (it.materialPrice || 0)),
              laborPrice: it.laborPrice || 0,
              laborAmount: it.laborAmount !== undefined ? it.laborAmount : ((it.quantity || 1) * (it.laborPrice || 0)),
              unitPrice: it.unitPrice || 0,
              amount: it.amount,
              notes: it.notes || '',
            })),
          }));
          setCategories(formattedCats);

          const hasCustom = (rev.categories || []).some((c: any) =>
            (c.items || []).some((it: any) =>
              Boolean(it.description && it.description !== '-' && it.description !== 'หมวดที่ 1' && it.description.trim() !== '') ||
              (Number(it.materialPrice) || 0) > 0 ||
              (Number(it.laborPrice) || 0) > 0 ||
              (Number(it.amount) || 0) > 0
            )
          );
          if (rev.attachmentUrl && !hasCustom) {
            setCreationMode('attachment');
            setAttachmentGrandTotal(rev.grandTotal || '');
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user && id) {
      fetchDocument();
      Promise.all([
        fetch('/api/projects').then((r) => r.json()),
        fetch('/api/customers').then((r) => r.json()),
        fetch('/api/locations').then((r) => r.json()),
        fetch('/api/templates').then((r) => r.json()),
      ]).then(([p, c, l, t]) => {
        setProjects(p.projects || []);
        setCustomers(c.customers || []);
        setLocations(l.locations || []);
        setTemplates(t.templates || []);
      });
    }
  }, [user, loading, id]);

  // Project change handler
  const handleProjectChange = (projId: string) => {
    setSelectedProjectId(projId);
    const p = projects.find((x) => x.id === projId);
    if (p) {
      if (p.workingLocation) setWorkingLocation(p.workingLocation);
      if (p.customerId) {
        setSelectedCustomerId(p.customerId);
        const c = customers.find((x) => x.id === p.customerId);
        if (c) {
          setCustomerName(c.name);
          setCustomerAddress(c.address || '');
          setCustomerTaxId(c.taxId || '');
        }
      }
    }
  };

  // Customer change handler
  const handleCustomerChange = (custId: string) => {
    setSelectedCustomerId(custId);
    const c = customers.find((x) => x.id === custId);
    if (c) {
      setCustomerName(c.name);
      setCustomerAddress(c.address || '');
      setCustomerTaxId(c.taxId || '');
    }
  };

  // Quick Add Project Handler
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      alert('กรุณากรอกชื่อโครงการ');
      return;
    }
    setSavingProject(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName.trim(),
          projectCode: newProjectCode.trim() || undefined,
          customerId: selectedCustomerId || undefined,
          workingLocation: workingLocation.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.project) {
        setProjects((prev) => [data.project, ...prev]);
        setSelectedProjectId(data.project.id);
        setIsProjectJob(true);
        setShowNewProjectModal(false);
        setNewProjectName('');
        setNewProjectCode('');
      } else {
        alert(data.error || 'ไม่สามารถสร้างโครงการได้');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSavingProject(false);
    }
  };

  // Add Location
  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName.trim()) return;
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLocationName.trim(),
          address: newLocationAddress.trim() || null,
          notes: newLocationNotes.trim() || null,
          projectId: selectedProjectId || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLocations((prev) => [data.location, ...prev]);
        setSelectedLocationId(data.location.id);
        setWorkingLocation(data.location.name);
        setShowLocationModal(false);
        setNewLocationName('');
        setNewLocationAddress('');
        setNewLocationNotes('');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  // Template Loader
  const handleApplyTemplate = (tpl: any) => {
    try {
      const parsed =
        typeof tpl.defaultItemsJson === 'string'
          ? JSON.parse(tpl.defaultItemsJson)
          : tpl.defaultItemsJson;
      if (Array.isArray(parsed) && parsed.length > 0) {
        const formatted = parsed.map((cat: any, cIdx: number) => ({
          name: cat.name || `หมวดงานที่ ${cIdx + 1}`,
          items: (cat.items || []).map((it: any, iIdx: number) => ({
            itemNo: iIdx + 1,
            description: it.description || '',
            specification: it.specification || '',
            unit: it.unit || 'งาน',
            quantity: Number(it.quantity) || 1,
            unitPrice: Number(it.unitPrice) || 0,
            amount: (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
            notes: it.notes || '',
          })),
        }));
        setCategories((prev) => [...prev, ...formatted]);
        setShowTemplateModal(false);
      }
    } catch {
      alert('ไม่สามารถโหลด Template ได้');
    }
  };

  // Category & Item operations
  const addCategory = () => {
    setCategories([
      ...categories,
      {
        name: `${categories.length + 1}. หมวดงานใหม่`,
        items: [
          {
            itemNo: 1,
            description: '',
            specification: '',
            unit: 'งาน',
            quantity: 1,
            unitPrice: 0,
            amount: 0,
            notes: '',
          },
        ],
      },
    ]);
  };

  const removeCategory = (cIdx: number) => {
    if (categories.length <= 1) {
      alert('ต้องมีอย่างน้อย 1 หมวดงาน');
      return;
    }
    setCategories(categories.filter((_, idx) => idx !== cIdx));
  };

  const updateCategoryName = (cIdx: number, name: string) => {
    const copy = [...categories];
    copy[cIdx].name = name;
    setCategories(copy);
  };

  const addItem = (cIdx: number) => {
    const copy = [...categories];
    copy[cIdx].items.push({
      itemNo: copy[cIdx].items.length + 1,
      description: '',
      specification: '',
      unit: 'JOB',
      quantity: 1,
      materialPrice: 0,
      materialAmount: 0,
      laborPrice: 0,
      laborAmount: 0,
      unitPrice: 0,
      amount: 0,
      notes: '',
    });
    setCategories(copy);
  };

  const duplicateItem = (cIdx: number, iIdx: number) => {
    const copy = [...categories];
    const source = copy[cIdx].items[iIdx];
    copy[cIdx].items.splice(iIdx + 1, 0, {
      ...source,
      itemNo: copy[cIdx].items.length + 1,
      description: `${source.description} (สำเนา)`,
    });
    setCategories(copy);
  };

  const removeItem = (cIdx: number, iIdx: number) => {
    const copy = [...categories];
    if (copy[cIdx].items.length <= 1) {
      alert('ต้องมีอย่างน้อย 1 รายการ');
      return;
    }
    copy[cIdx].items = copy[cIdx].items.filter((_, idx) => idx !== iIdx);
    copy[cIdx].items.forEach((it, idx) => {
      it.itemNo = idx + 1;
    });
    setCategories(copy);
  };

  const updateItemField = (
    cIdx: number,
    iIdx: number,
    field: keyof BoqItemInput,
    val: any
  ) => {
    const copy = [...categories];
    const target = { ...copy[cIdx].items[iIdx], [field]: val };
    if (
      field === 'quantity' ||
      field === 'materialPrice' ||
      field === 'laborPrice' ||
      field === 'unitPrice'
    ) {
      const q = field === 'quantity' ? Number(val) || 0 : Number(target.quantity) || 0;
      const m = field === 'materialPrice' ? Number(val) || 0 : Number(target.materialPrice) || 0;
      const l = field === 'laborPrice' ? Number(val) || 0 : Number(target.laborPrice) || 0;
      target.materialPrice = m;
      target.laborPrice = l;
      target.materialAmount = Math.round(q * m * 100) / 100;
      target.laborAmount = Math.round(q * l * 100) / 100;
      target.unitPrice = m + l > 0 ? m + l : (field === 'unitPrice' ? Number(val) || 0 : Number(target.unitPrice) || 0);
      target.amount =
        target.materialAmount + target.laborAmount > 0
          ? Math.round((target.materialAmount + target.laborAmount) * 100) / 100
          : Math.round(q * target.unitPrice * 100) / 100;
    }
    copy[cIdx].items[iIdx] = target;
    setCategories(copy);
  };

  const handleImportExcelItems = (
    importedItems: any[],
    targetCategoryIdx: number,
    newCatTitle?: string
  ) => {
    if (targetCategoryIdx === -1) {
      setCategories((prev) => [
        ...prev,
        {
          name: (newCatTitle || '').trim() || `หมวดงานนำเข้าจาก Excel (${new Date().toLocaleDateString('th-TH')})`,
          items: importedItems.map((it, idx) => ({ ...it, itemNo: idx + 1 })),
        },
      ]);
    } else {
      setCategories((prev) => {
        const copy = [...prev];
        const curCat = copy[targetCategoryIdx];
        if (!curCat) return prev;

        const isCurCatEmpty =
          curCat.items.length === 1 &&
          !curCat.items[0].description.trim() &&
          curCat.items[0].unitPrice === 0;

        if (isCurCatEmpty) {
          curCat.items = importedItems.map((it, idx) => ({ ...it, itemNo: idx + 1 }));
        } else {
          const startNo = curCat.items.length + 1;
          const renumbered = importedItems.map((it, idx) => ({ ...it, itemNo: startNo + idx }));
          curCat.items = [...curCat.items, ...renumbered];
        }
        return copy;
      });
    }
  };

  // Live calculation
  const allFlat = categories.flatMap((c) =>
    c.items.map((i) => ({
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      materialPrice: i.materialPrice,
      laborPrice: i.laborPrice,
    }))
  );
  const totals = calculateDocumentTotals({
    items: allFlat,
    vatRate,
    isVatIncluded,
    discountType,
    discountValue,
    overheadRate,
  });

  // Save handler with Optimistic Concurrency Control
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError(null);
    setSaving(true);

    try {
      const payload = {
        expectedVersion: document.version, // Optimistic Lock Check
        documentNumber: documentNumber.trim() || undefined,
        title: title.trim(),
        status,
        projectId: isProjectJob ? (selectedProjectId || null) : null,
        customerId: selectedCustomerId || null,
        locationId: selectedLocationId || null,
        customerName: customerName.trim() || null,
        customerAddress: customerAddress.trim() || null,
        customerTaxId: customerTaxId.trim() || null,
        workingLocation: workingLocation.trim() || null,
        attnName: attnName.trim() || null,
        contactPerson: contactPerson.trim() || null,
        contactPhone: contactPhone.trim() || null,
        sitePhotoUrl: sitePhotoUrl.trim() || null,
        attachmentUrl: attachmentUrl.trim() || null,
        attachmentName: attachmentName.trim() || null,
        attachmentSize: attachmentSize || null,
        grandTotal: creationMode === 'attachment' ? (Number(attachmentGrandTotal) || 0) : undefined,
        revisionId: document.revisions?.[0]?.id,
        documentDate,
        expiryDate: expiryDate || null,
        preparedBy,
        preparedSignatureUrl,
        preparedDate: preparedDate || null,
        checkedBy,
        checkedSignatureUrl,
        checkedDate: checkedDate || null,
        approvedBy,
        approvedSignatureUrl,
        approvedDate: approvedDate || null,
        clientSignerName,
        clientSignatureUrl,
        clientSignedDate: clientSignedDate || null,
        notes,
        paymentTerms: creationMode === 'attachment' ? null : paymentTerms,
        executionDuration: creationMode === 'attachment' ? null : executionDuration,
        warrantyDuration: creationMode === 'attachment' ? null : warrantyDuration,
        overheadRate: creationMode === 'attachment' ? 0 : overheadRate,
        vatRate: creationMode === 'attachment' ? 0 : vatRate,
        isVatIncluded,
        discountType,
        discountValue,
        categories: creationMode === 'attachment' ? [] : categories,
      };

      const res = await fetch(`/api/documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert('บันทึกเอกสารเรียบร้อยแล้ว');
        router.push(`/documents/${id}`);
      } else if (res.status === 409) {
        // Optimistic lock conflict detected!
        setConflictError(data.message);
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSaving(false);
    }
  };

  const filteredProjects = selectedCustomerId
    ? projects.filter((p) => !p.customerId || p.customerId === selectedCustomerId)
    : projects;

  if (loading || fetching || !document) {
    return <div className="p-12 text-center text-slate-400">กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div className="flex-1 flex flex-col pb-24">
      <Header
        title={`แก้ไขเอกสาร: ${document.documentNumber} (${document.latestRevisionCode})`}
        subtitle="แก้ไขข้อมูลโครงการ ปริมาณงาน และราคาต่อหน่วย"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/documents/${id}`}
              className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              ยกเลิก
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
            </button>
          </div>
        }
      />

      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Conflict Error Notification */}
        {conflictError && (
          <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-xl text-rose-900 text-xs shadow-md flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-sm text-rose-800">
                ตรวจพบการแก้ไขข้อมูลพร้อมกัน (Concurrency Conflict)
              </h4>
              <p className="mt-1">{conflictError}</p>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={fetchDocument}
                  className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded text-xs shadow-xs"
                >
                  โหลดข้อมูลล่าสุดเพื่อดำเนินการต่อ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Creation Mode Switcher */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              วิธีจัดทำเอกสาร (Document Method)
            </h3>
            <p className="text-xs text-slate-500">
              เลือก <strong>&quot;แนบไฟล์เอกสารต้นฉบับ&quot;</strong> สำหรับงานที่มีไฟล์ BOQ / สัญญาเดิมอยู่แล้ว หรือเลือก <strong>&quot;สร้างตารางในระบบ&quot;</strong> เมื่อต้องการพิมพ์รายการคำนวณราคา
            </p>
          </div>
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => setCreationMode('attachment')}
              className={`px-4 py-2 rounded-lg flex items-center gap-1.5 transition ${
                creationMode === 'attachment'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>📄 แนบไฟล์เอกสารต้นฉบับ / BOQ เดิม</span>
            </button>
            <button
              type="button"
              onClick={() => setCreationMode('table')}
              className={`px-4 py-2 rounded-lg flex items-center gap-1.5 transition ${
                creationMode === 'table'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>📝 สร้างตาราง BOQ ผ่านระบบ</span>
            </button>
          </div>
        </div>

        {/* Section 1: Header */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              ข้อมูลเอกสารและโครงการ
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-700 font-bold">เลขที่เอกสาร:</span>
                <input
                  type="text"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  className="text-xs border border-slate-300 rounded px-2.5 py-1 bg-white font-mono font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                  placeholder="เช่น TW-67-001 หรือ TW-69-001"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold">สถานะ:</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="text-xs border border-slate-300 rounded px-2.5 py-1 bg-white font-medium"
                >
                  <option value="DRAFT">ร่างเอกสาร (Draft)</option>
                  <option value="IN_PROGRESS">กำลังจัดทำ (In Progress)</option>
                  <option value="PENDING_REVIEW">รอตรวจสอบ (Review)</option>
                  <option value="APPROVED">อนุมัติแล้ว (Approved)</option>
                  <option value="SENT">ส่งลูกค้าแล้ว (Sent)</option>
                  <option value="ACCEPTED">ลูกค้ารับราคา (Accepted)</option>
                  <option value="CANCELLED">ยกเลิก (Cancelled)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 1. ข้อมูลโรงพยาบาล / ลูกค้า */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-blue-600" />
                โรงพยาบาล / ลูกค้า
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">เลือกจากรายชื่อ:</span>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- ดึงจากรายชื่อโรงพยาบาล / ลูกค้า --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="ชื่อโรงพยาบาล หรือ บริษัทลูกค้า..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs md:text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={customerTaxId}
                onChange={(e) => setCustomerTaxId(e.target.value)}
                placeholder="เลขประจำตัวผู้เสียภาษี (ถ้ามี)..."
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none"
              />
              <input
                type="text"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="ที่อยู่โรงพยาบาล / สาขา / ที่ตั้ง..."
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* 2. ตัวเลือกลักษณะงาน: งานทั่วไป หรือ งานโครงการ */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-800">
              ลักษณะงาน (เลือกประเภทของงาน)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsProjectJob(false);
                  setSelectedProjectId('');
                }}
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition ${
                  !isProjectJob
                    ? 'border-blue-600 bg-blue-50/60 shadow-xs ring-1 ring-blue-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                    !isProjectJob ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                  }`}
                >
                  {!isProjectJob && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    📄 งานทั่วไป (ไม่ใช่โครงการ)
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    งานซ่อมบำรุง, งานเปลี่ยนอุปกรณ์, ตรวจเช็คทั่วไป ไม่ได้สังกัดโครงการ
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsProjectJob(true)}
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition ${
                  isProjectJob
                    ? 'border-indigo-600 bg-indigo-50/60 shadow-xs ring-1 ring-indigo-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                    isProjectJob ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                  }`}
                >
                  {isProjectJob && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    📁 งานในโครงการ
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    งานที่เป็นส่วนหนึ่งของโครงการหลัก มีสัญญาหรือโครงการแม่กำกับ
                  </span>
                </div>
              </button>
            </div>

            {/* ถ้าเลือกงานโครงการ ให้แสดง Dropdown โครงการของ รพ. นี้ */}
            {isProjectJob && (
              <div className="p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-200/70 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <FolderKanban className="w-3.5 h-3.5 text-indigo-600" />
                    เลือกโครงการอ้างอิง {customerName ? `(ของ ${customerName})` : ''} <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewProjectModal(true)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-white px-2.5 py-1 rounded-md border border-indigo-200 hover:border-indigo-300 shadow-2xs"
                  >
                    <Plus className="w-3 h-3" />
                    สร้างโครงการใหม่
                  </button>
                </div>

                <select
                  value={selectedProjectId}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  className="w-full border border-indigo-300 rounded-lg px-3 py-2 text-xs md:text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                >
                  <option value="">-- เลือกโครงการ (หรือกดสร้างโครงการใหม่ด้านบน) --</option>
                  {filteredProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectCode ? `[${p.projectCode}] ` : ''}{p.name}
                    </option>
                  ))}
                </select>
                {filteredProjects.length === 0 && (
                  <p className="text-[11px] text-indigo-600">
                    ยังไม่มีโครงการที่ผูกกับโรงพยาบาลนี้ สามารถกดปุ่ม <strong>"+ สร้างโครงการใหม่"</strong> เพื่อเพิ่มโครงการได้เลย
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 3. ชื่องาน และ สถานที่ปฏิบัติงาน */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isProjectJob ? 'ชื่องาน / ชื่องวดงานในโครงการ' : 'ชื่อโครงการ / ชื่องาน'} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  isProjectJob
                    ? 'เช่น งานติดตั้งระบบท่อส่งก๊าซทางการแพทย์ งวดที่ 1'
                    : 'เช่น งานซ่อมบำรุงเปลี่ยนวาล์วดับเพลิง ชั้น 2'
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs md:text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                สถานที่ปฏิบัติงาน (จุดทำงานภายในโรงพยาบาล)
              </label>
              <input
                type="text"
                value={workingLocation}
                onChange={(e) => setWorkingLocation(e.target.value)}
                placeholder="เช่น แผนกคลังยา ชั้น 1 อาคาร PA หรือ ห้องผ่าตัด OR 3..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs md:text-sm bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Contact & Attn Box */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                เรียน (Attention To)
              </label>
              <input
                type="text"
                value={attnName}
                onChange={(e) => setAttnName(e.target.value)}
                placeholder="เช่น ผู้จัดการฝ่ายวิศวกรรม"
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                ผู้ประสานงาน (CONTACT)
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="เช่น พิษณุวัชร์ นันทวงศ์การ"
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                เบอร์โทรศัพท์ (Telephone)
              </label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="เช่น 088-287-8259"
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white"
              />
            </div>
          </div>

          {/* Dates & Signers */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                วันที่จัดทำ
              </label>
              <input
                type="date"
                value={documentDate}
                onChange={(e) => setDocumentDate(e.target.value)}
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                ยืนราคาถึงวันที่
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">ผู้จัดทำ</label>
              <input
                type="text"
                value={preparedBy}
                onChange={(e) => setPreparedBy(e.target.value)}
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                ผู้ตรวจสอบ
              </label>
              <input
                type="text"
                value={checkedBy}
                onChange={(e) => setCheckedBy(e.target.value)}
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs bg-white"
              />
            </div>
          </div>
        </div>

        {/* Method 1: Original Document Attachment (Prominent Card above BOQ Table) */}
        <div className="bg-white p-5 rounded-xl border-2 border-blue-200/80 shadow-xs space-y-3 bg-gradient-to-r from-blue-50/50 via-white to-slate-50/40">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Paperclip className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  แนบไฟล์เอกสารต้นฉบับ / สัญญาเดิม (PDF, Excel, ภาพสแกน)
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    สำหรับลง BOQ เก่า
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  แนบไฟล์สัญญาเดิม ใบเสนอราคาเก่า หรือสเปกอ้างอิง เพื่อเก็บเป็นหลักฐานคู่กับเอกสารนี้
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition">
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {uploadingAttachment
                    ? 'กำลังอัปโหลด...'
                    : attachmentUrl
                    ? 'เปลี่ยนไฟล์แนบ'
                    : '+ แนบไฟล์ต้นฉบับ (PDF / Excel / ภาพสแกน)'}
                </span>
                <input
                  type="file"
                  accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.zip,.png,.jpg,.jpeg"
                  disabled={uploadingAttachment}
                  onChange={handleAttachmentUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {attachmentUrl ? (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {attachmentName || 'ไฟล์เอกสารต้นฉบับแนบ'}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                    {attachmentSize ? (
                      <span>
                        {(attachmentSize / 1024 > 1024
                          ? (attachmentSize / (1024 * 1024)).toFixed(2) + ' MB'
                          : (attachmentSize / 1024).toFixed(1) + ' KB')}
                      </span>
                    ) : null}
                    <span>• อัปโหลดเรียบร้อยแล้ว</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAiModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  ✨ ให้ AI ดึงข้อมูลเข้าตาราง (AI Extract)
                </button>
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-blue-700 border border-blue-200 text-xs font-semibold shadow-2xs transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  เปิดดูไฟล์
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setAttachmentUrl('');
                    setAttachmentName('');
                    setAttachmentSize(null);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  ลบไฟล์
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-blue-300 rounded-xl p-4 bg-white/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Paperclip className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-800">
                    ยังไม่ได้แนบไฟล์ต้นฉบับ (Optional)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    รองรับไฟล์ PDF, Excel (.xlsx, .xls), Word (.docx), หรือรูปภาพสแกนสัญญาเดิม
                  </div>
                </div>
              </div>
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold shadow-2xs transition">
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>{uploadingAttachment ? 'กำลังอัปโหลด...' : '+ เลือกไฟล์จากเครื่อง'}</span>
                <input
                  type="file"
                  accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.zip,.png,.jpg,.jpeg"
                  disabled={uploadingAttachment}
                  onChange={handleAttachmentUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {/* Section: Grand Total Input for Attached Document */}
        {creationMode === 'attachment' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-600" />
                ยอดเงินรวมมูลค่าโครงการตามเอกสารแนบ (Grand Total)
              </h3>
              <span className="text-xs text-slate-400">ระบุเพื่อใช้คำนวณในรายงานและ Dashboard</span>
            </div>
            <div className="max-w-md space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                ยอดเงินรวมทั้งสิ้น (บาท):
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={attachmentGrandTotal}
                  onChange={(e) => setAttachmentGrandTotal(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="เช่น 150000 (หรือเว้นว่างไว้หากยังไม่สรุปยอด)"
                  className="w-full border-2 border-slate-300 rounded-lg pl-8 pr-4 py-2 text-sm font-mono font-bold focus:border-blue-600 focus:outline-none bg-white"
                />
                <span className="absolute left-3 top-2.5 font-bold text-slate-400">฿</span>
              </div>
              <p className="text-[11px] text-slate-500">
                * เมื่อบันทึก ระบบจะบันทึกเอกสารแนบพร้อมยอดเงินนี้ทันที โดยไม่ต้องกรอกตารางรายการซ้ำซ้อน
              </p>
            </div>
          </div>
        )}

        {/* Sections for Table Mode Only */}
        {creationMode === 'table' && (
          <>
          {/* Section 2: Interactive BOQ Table */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                ตารางรายการงานและราคาต่อหน่วย
              </h2>
              <p className="text-xs text-slate-500">
                แก้ไขรายการใน Revision {document.latestRevisionCode}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowExcelModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-300 transition shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                นำเข้าจาก Excel (คัดลอกมาวาง)
              </button>
              <button
                type="button"
                onClick={addCategory}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 transition shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                เพิ่มหมวดงานใหม่
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {categories.map((cat, cIdx) => {
              const catSubtotal = cat.items.reduce(
                (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
                0
              );

              return (
                <div
                  key={cIdx}
                  className="rounded-xl border border-slate-200 overflow-hidden shadow-xs bg-white"
                >
                  <div className="bg-slate-100 p-3 flex items-center justify-between gap-2 border-b border-slate-200">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      <input
                        type="text"
                        value={cat.name}
                        onChange={(e) => updateCategoryName(cIdx, e.target.value)}
                        className="font-bold text-xs md:text-sm text-slate-800 bg-transparent border-b border-dashed border-slate-400 focus:border-blue-600 focus:outline-none w-full max-w-lg px-1"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-xs font-mono text-slate-700">
                        รวมหมวดนี้:{' '}
                        <span className="font-bold text-blue-900">
                          ฿{catSubtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCategory(cIdx)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-200 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <th className="p-2 text-center w-10">ลำดับ</th>
                          <th className="p-2 text-left min-w-[220px]">รายการ / รายละเอียดงาน</th>
                          <th className="p-2 text-left min-w-[160px]">Specification / สเปค</th>
                          <th className="p-2 text-center w-16">หน่วย</th>
                          <th className="p-2 text-right w-16">จำนวน</th>
                          <th className="p-2 text-center bg-blue-50/70 border-l border-blue-200" colSpan={2}>
                            Material Charge (ค่าวัสดุ)
                          </th>
                          <th className="p-2 text-center bg-emerald-50/70 border-l border-emerald-200" colSpan={2}>
                            Labour Charge (ค่าแรง)
                          </th>
                          <th className="p-2 text-right w-24 border-l border-slate-200">Total (รวมเงิน)</th>
                          <th className="p-2 text-center w-16">จัดการ</th>
                        </tr>
                        <tr className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 text-[10.5px]">
                          <th colSpan={5}></th>
                          <th className="p-1.5 text-right w-20 bg-blue-50/40 border-l border-blue-200">ราคา/หน่วย</th>
                          <th className="p-1.5 text-right w-20 bg-blue-50/40">รวมค่าของ</th>
                          <th className="p-1.5 text-right w-20 bg-emerald-50/40 border-l border-emerald-200">ราคา/หน่วย</th>
                          <th className="p-1.5 text-right w-20 bg-emerald-50/40">รวมค่าแรง</th>
                          <th colSpan={2}></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cat.items.map((it, iIdx) => (
                          <tr key={iIdx} className="hover:bg-slate-50/70 transition">
                            <td className="p-2 text-center text-slate-400 font-mono">
                              {it.itemNo}
                            </td>

                            <td className="p-2">
                              <textarea
                                rows={2}
                                value={it.description}
                                onChange={(e) =>
                                  updateItemField(cIdx, iIdx, 'description', e.target.value)
                                }
                                placeholder="รายละเอียดงาน / อุปกรณ์..."
                                className="w-full border border-slate-200 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
                              />
                            </td>

                            <td className="p-2">
                              <textarea
                                rows={2}
                                value={it.specification}
                                onChange={(e) =>
                                  updateItemField(cIdx, iIdx, 'specification', e.target.value)
                                }
                                placeholder="- สเปค หรือ bullet list ย่อย..."
                                className="w-full border border-slate-200 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
                              />
                            </td>

                            <td className="p-2 text-center">
                              <input
                                type="text"
                                value={it.unit}
                                onChange={(e) =>
                                  updateItemField(cIdx, iIdx, 'unit', e.target.value)
                                }
                                placeholder="JOB"
                                className="w-full border border-slate-200 rounded p-1 text-xs text-center focus:ring-1 focus:ring-blue-600 focus:outline-none"
                              />
                            </td>

                            <td className="p-2 text-right">
                              <input
                                type="number"
                                step="any"
                                value={it.quantity}
                                onChange={(e) =>
                                  updateItemField(cIdx, iIdx, 'quantity', e.target.value)
                                }
                                className="w-full border border-slate-200 rounded p-1 text-xs text-right font-mono focus:ring-1 focus:ring-blue-600 focus:outline-none"
                              />
                            </td>

                            {/* Material Price & Amount */}
                            <td className="p-2 text-right bg-blue-50/20 border-l border-blue-100">
                              <input
                                type="number"
                                step="any"
                                value={it.materialPrice}
                                onChange={(e) =>
                                  updateItemField(cIdx, iIdx, 'materialPrice', e.target.value)
                                }
                                placeholder="0"
                                className="w-full border border-blue-200 rounded p-1 text-xs text-right font-mono focus:ring-1 focus:ring-blue-600 focus:outline-none"
                              />
                            </td>
                            <td className="p-2 text-right font-mono text-slate-700 bg-blue-50/20">
                              {(it.materialAmount || 0) > 0 ? (it.materialAmount || 0).toLocaleString('th-TH') : '-'}
                            </td>

                            {/* Labour Price & Amount */}
                            <td className="p-2 text-right bg-emerald-50/20 border-l border-emerald-100">
                              <input
                                type="number"
                                step="any"
                                value={it.laborPrice}
                                onChange={(e) =>
                                  updateItemField(cIdx, iIdx, 'laborPrice', e.target.value)
                                }
                                placeholder="0"
                                className="w-full border border-emerald-200 rounded p-1 text-xs text-right font-mono focus:ring-1 focus:ring-blue-600 focus:outline-none"
                              />
                            </td>
                            <td className="p-2 text-right font-mono text-slate-700 bg-emerald-50/20">
                              {(it.laborAmount || 0) > 0 ? (it.laborAmount || 0).toLocaleString('th-TH') : '-'}
                            </td>

                            {/* Total Amount */}
                            <td className="p-2 text-right font-mono font-bold text-slate-900 border-l border-slate-200">
                              {(it.amount || 0) > 0 ? (it.amount || 0).toLocaleString('th-TH') : '-'}
                            </td>

                            <td className="p-2 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => duplicateItem(cIdx, iIdx)}
                                  title="คัดลอกแถวนี้"
                                  className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeItem(cIdx, iIdx)}
                                  title="ลบแถวนี้"
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-2 bg-slate-50 border-t border-slate-200 flex justify-center">
                    <button
                      type="button"
                      onClick={() => addItem(cIdx)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-600" />
                      เพิ่มแถวรายการในหมวดนี้
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pricing & VAT Summary Card */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                การคิดภาษีและส่วนลด
              </h3>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  ภาษีมูลค่าเพิ่ม (VAT)
                </label>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="vatRate"
                      checked={vatRate === 7.0}
                      onChange={() => setVatRate(7.0)}
                      className="text-blue-600"
                    />
                    <span>คิด VAT 7%</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="vatRate"
                      checked={vatRate === 0}
                      onChange={() => setVatRate(0)}
                      className="text-blue-600"
                    />
                    <span>ไม่คิด VAT (0%)</span>
                  </label>
                </div>
              </div>

              {vatRate > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    รูปแบบราคาในตาราง
                  </label>
                  <div className="flex items-center gap-4 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="isVatIncluded"
                        checked={!isVatIncluded}
                        onChange={() => setIsVatIncluded(false)}
                        className="text-blue-600"
                      />
                      <span>ราคายังไม่รวม VAT</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="isVatIncluded"
                        checked={isVatIncluded}
                        onChange={() => setIsVatIncluded(true)}
                        className="text-blue-600"
                      />
                      <span>ราคารวม VAT 7% แล้ว</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">ส่วนลด</label>
                <div className="flex items-center gap-2">
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white"
                  >
                    <option value="PERCENT">เปอร์เซ็นต์ (%)</option>
                    <option value="AMOUNT">จำนวนเงิน (฿)</option>
                  </select>
                  <input
                    type="number"
                    step="any"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                    className="w-32 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-right font-mono bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">รวมค่าวัสดุและอุปกรณ์ (Material Total):</span>
                <span className="font-mono font-bold text-slate-800">
                  ฿{totals.materialTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">รวมค่าแรงงาน (Labour Total):</span>
                <span className="font-mono font-bold text-slate-800">
                  ฿{totals.laborTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600 font-semibold">ค่าใช้จ่ายทั้งหมด (Subtotal):</span>
                <span className="font-mono font-bold text-slate-900">
                  ฿{totals.subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600">ค่าดำเนินการและผลกำไร:</span>
                  <input
                    type="number"
                    step="any"
                    value={overheadRate}
                    onChange={(e) => setOverheadRate(Number(e.target.value) || 0)}
                    className="w-14 border border-slate-300 rounded px-1.5 py-0.5 text-right font-mono text-xs"
                  />
                  <span className="text-slate-500">%</span>
                </div>
                <span className="font-mono font-bold text-slate-800">
                  ฿{totals.overheadAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">ราคารวมทั้งหมด (Total Before VAT):</span>
                <span className="font-mono font-bold text-slate-800">
                  ฿{totals.totalBeforeVat.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">ภาษีมูลค่าเพิ่ม VAT {vatRate}%:</span>
                <span className="font-mono font-bold text-slate-800">
                  ฿{totals.vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between py-2 border-t-2 border-slate-300 text-sm">
                <span className="font-bold text-slate-900">รวมยอดเงินทั้งหมด (Grand Total):</span>
                <span className="font-mono font-extrabold text-blue-900 text-base">
                  ฿{totals.grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-2.5 rounded bg-blue-50 border border-blue-200 text-blue-950 font-medium text-center">
                ({totals.thaiBahtText})
              </div>
            </div>
          </div>
        </div>

        {/* Commercial Terms */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            เงื่อนไขทางการค้าและหมายเหตุท้ายเอกสาร
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ระยะเวลาดำเนินงาน
              </label>
              <input
                type="text"
                value={executionDuration}
                onChange={(e) => setExecutionDuration(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ระยะเวลารับประกันงาน
              </label>
              <input
                type="text"
                value={warrantyDuration}
                onChange={(e) => setWarrantyDuration(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เงื่อนไขการชำระเงิน
              </label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">หมายเหตุเพิ่มเติม</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-slate-300 rounded p-2 text-xs bg-white"
            />
          </div>
        </div>

        {/* Signatures & Attached Photo */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-600" />
              ลายเซ็นดิจิทัลและผู้ลงนาม (Signatures & Approvals)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              สามารถกรอกชื่อ กำหนดวันที่ และแนบรูปภาพลายเซ็นดิจิทัลสำหรับแต่ละคน เพื่อแสดงผลท้ายเอกสารและ PDF
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. ผู้ตกลงรับราคา */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">1. ผู้ตกลงรับราคา</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-semibold">Customer / Client</span>
              </div>
              <p className="text-[11px] text-slate-500">สามารถเขียนชื่อ หรือแนบรูปลายเซ็น (หรือเว้นไว้เซ็นสด)</p>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">ชื่อ-นามสกุล ผู้ตกลงรับราคา</label>
                <input
                  type="text"
                  value={clientSignerName}
                  onChange={(e) => setClientSignerName(e.target.value)}
                  placeholder="เช่น นายสมชาย ใจดี หรือเว้นว่างหากเซ็นสด"
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">วันที่ตกลงรับราคา</label>
                <input
                  type="date"
                  value={clientSignedDate}
                  onChange={(e) => setClientSignedDate(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">รูปลายเซ็นดิจิทัล (ถ้ามี)</label>
                {clientSignatureUrl ? (
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-col gap-2">
                    <div className="flex items-center justify-center bg-slate-50/60 rounded p-1.5 min-h-[50px]">
                      <img src={clientSignatureUrl} alt="ลายเซ็นลูกค้า" className="h-10 max-w-[140px] object-contain" />
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setSignModalConfig({
                              isOpen: true,
                              title: 'เซ็นลายเซ็นผู้ตกลงรับราคา',
                              onSave: (url) => setClientSignatureUrl(url),
                            })
                          }
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium inline-flex items-center gap-1"
                        >
                          <PenTool className="w-3 h-3 text-slate-600" />
                          <span>เซ็นใหม่</span>
                        </button>
                        <label className="cursor-pointer px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium inline-flex items-center gap-1">
                          <Upload className="w-3 h-3 text-slate-600" />
                          <span>แนบไฟล์ใหม่</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleUploadSignature(f, setClientSignatureUrl);
                              e.target.value = '';
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => setClientSignatureUrl('')}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                        title="ลบลายเซ็น"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSignModalConfig({
                          isOpen: true,
                          title: 'เซ็นลายเซ็นผู้ตกลงรับราคา',
                          onSave: (url) => setClientSignatureUrl(url),
                        })
                      }
                      className="flex items-center justify-center gap-1.5 p-2 rounded-lg border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 text-[11px] font-semibold transition shadow-2xs"
                    >
                      <PenTool className="w-3.5 h-3.5 text-emerald-600" />
                      <span>เซ็นสด</span>
                    </button>
                    <label className="cursor-pointer flex items-center justify-center gap-1.5 p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold transition shadow-2xs">
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      <span>แนบไฟล์</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadSignature(f, setClientSignatureUrl);
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* 2. ผู้จัดทำและเสนอราคา */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">2. ผู้จัดทำและเสนอราคา</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-semibold">Prepared By</span>
              </div>
              <p className="text-[11px] text-slate-500">เลือกพิมพ์ชื่อลงในช่อง หรือแนบรูปลายเซ็นดิจิทัล</p>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">ชื่อ-นามสกุล ผู้จัดทำ</label>
                <input
                  type="text"
                  value={preparedBy}
                  onChange={(e) => setPreparedBy(e.target.value)}
                  placeholder="เช่น วรัญญา คำดำ"
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">วันที่เสนอราคา</label>
                <input
                  type="date"
                  value={preparedDate}
                  onChange={(e) => setPreparedDate(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">รูปลายเซ็นดิจิทัล (ถ้ามี)</label>
                {preparedSignatureUrl ? (
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-col gap-2">
                    <div className="flex items-center justify-center bg-slate-50/60 rounded p-1.5 min-h-[50px]">
                      <img src={preparedSignatureUrl} alt="ลายเซ็น" className="h-10 max-w-[140px] object-contain" />
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setSignModalConfig({
                              isOpen: true,
                              title: 'เซ็นลายเซ็นผู้จัดทำและเสนอราคา',
                              onSave: (url) => setPreparedSignatureUrl(url),
                            })
                          }
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium inline-flex items-center gap-1"
                        >
                          <PenTool className="w-3 h-3 text-slate-600" />
                          <span>เซ็นใหม่</span>
                        </button>
                        <label className="cursor-pointer px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium inline-flex items-center gap-1">
                          <Upload className="w-3 h-3 text-slate-600" />
                          <span>แนบไฟล์ใหม่</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleUploadSignature(f, setPreparedSignatureUrl);
                              e.target.value = '';
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreparedSignatureUrl('')}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                        title="ลบลายเซ็น"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSignModalConfig({
                          isOpen: true,
                          title: 'เซ็นลายเซ็นผู้จัดทำและเสนอราคา',
                          onSave: (url) => setPreparedSignatureUrl(url),
                        })
                      }
                      className="flex items-center justify-center gap-1.5 p-2 rounded-lg border border-blue-300 bg-white hover:bg-blue-50 text-blue-800 text-[11px] font-semibold transition shadow-2xs"
                    >
                      <PenTool className="w-3.5 h-3.5 text-blue-600" />
                      <span>เซ็นสด</span>
                    </button>
                    <label className="cursor-pointer flex items-center justify-center gap-1.5 p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold transition shadow-2xs">
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      <span>แนบไฟล์</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadSignature(f, setPreparedSignatureUrl);
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* 3. บริษัท เทคนิคอล วอเตอร์ จำกัด */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">3. บริษัท เทคนิคอล วอเตอร์ จำกัด</span>
                <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-semibold">Authorized</span>
              </div>
              <p className="text-[11px] text-slate-500">ผู้มีอำนาจลงนาม พร้อมลายเซ็นและตราประทับบริษัท</p>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">ชื่อ / ตำแหน่ง</label>
                <input
                  type="text"
                  value={approvedBy}
                  onChange={(e) => setApprovedBy(e.target.value)}
                  placeholder="เช่น ผู้มีอำนาจลงนาม / AUTHORIZED SIGNATURE"
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">วันที่อนุมัติ</label>
                <input
                  type="date"
                  value={approvedDate}
                  onChange={(e) => setApprovedDate(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">รูปลายเซ็น + ตราประทับ</label>
                {approvedSignatureUrl ? (
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-col gap-2">
                    <div className="flex items-center justify-center bg-slate-50/60 rounded p-1.5 min-h-[50px]">
                      <img src={approvedSignatureUrl} alt="ลายเซ็น" className="h-10 max-w-[140px] object-contain" />
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setSignModalConfig({
                              isOpen: true,
                              title: 'เซ็นลายเซ็นผู้มีอำนาจลงนาม',
                              onSave: (url) => setApprovedSignatureUrl(url),
                            })
                          }
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium inline-flex items-center gap-1"
                        >
                          <PenTool className="w-3 h-3 text-slate-600" />
                          <span>เซ็นใหม่</span>
                        </button>
                        <label className="cursor-pointer px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium inline-flex items-center gap-1">
                          <Upload className="w-3 h-3 text-slate-600" />
                          <span>แนบไฟล์ใหม่</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleUploadSignature(f, setApprovedSignatureUrl);
                              e.target.value = '';
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => setApprovedSignatureUrl('')}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                        title="ลบลายเซ็น"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSignModalConfig({
                          isOpen: true,
                          title: 'เซ็นลายเซ็นผู้มีอำนาจลงนาม',
                          onSave: (url) => setApprovedSignatureUrl(url),
                        })
                      }
                      className="flex items-center justify-center gap-1.5 p-2 rounded-lg border border-purple-300 bg-white hover:bg-purple-50 text-purple-800 text-[11px] font-semibold transition shadow-2xs"
                    >
                      <PenTool className="w-3.5 h-3.5 text-purple-600" />
                      <span>เซ็นสด</span>
                    </button>
                    <label className="cursor-pointer flex items-center justify-center gap-1.5 p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold transition shadow-2xs">
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      <span>แนบไฟล์</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadSignature(f, setApprovedSignatureUrl);
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Photo attachment section */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-blue-600" />
              รูปภาพประกอบหน้างาน / อุปกรณ์ (แนบท้ายใบเสนอราคา)
            </h4>
            <div className="flex flex-wrap items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploadingPhoto ? 'กำลังอัปโหลด...' : (sitePhotoUrl ? 'เปลี่ยนรูปภาพประกอบ' : '+ เลือกรูปภาพจากเครื่อง')}</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingPhoto}
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>

              {sitePhotoUrl && (
                <button
                  type="button"
                  onClick={() => setSitePhotoUrl('')}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบรูปภาพ</span>
                </button>
              )}

              <span className="text-[11px] text-slate-400">
                รองรับไฟล์รูปภาพ JPG, PNG, WebP เพื่อแนบท้ายเอกสารและ PDF
              </span>
            </div>

            {sitePhotoUrl && (
              <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 inline-block">
                <img
                  src={sitePhotoUrl}
                  alt="รูปภาพประกอบ"
                  className="max-h-48 rounded object-contain border border-slate-300 bg-white"
                />
              </div>
            )}
          </div>
        </div>
        </>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href={`/documents/${id}`}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
          >
            ยกเลิก
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
          </button>
        </div>
      </div>

      {/* Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-sm text-slate-900">เพิ่มสถานที่ใหม่</h3>
              <button
                onClick={() => setShowLocationModal(false)}
                className="p-1 rounded text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateLocation} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อสถานที่ *</label>
                <input
                  type="text"
                  required
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-100 text-slate-700 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 text-white font-semibold"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 border border-slate-200 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-sm text-slate-900">เพิ่มรายการจาก Template</h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-1 rounded text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="p-4 rounded-lg border border-slate-200 hover:border-indigo-400 flex items-center justify-between gap-4"
                >
                  <div>
                    <span className="font-bold text-xs text-slate-900">{tpl.name}</span>
                    <p className="text-xs text-slate-500 mt-1">{tpl.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate(tpl)}
                    className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shrink-0"
                  >
                    เพิ่มหมวดนี้
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Quick Add Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-indigo-600" />
                สร้างโครงการใหม่สำหรับโรงพยาบาลนี้
              </h3>
              <button
                type="button"
                onClick={() => setShowNewProjectModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อโครงการ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="เช่น โครงการระบบปรับอากาศตึกอุบัติเหตุ"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสโครงการ (ถ้ามี)
                </label>
                <input
                  type="text"
                  value={newProjectCode}
                  onChange={(e) => setNewProjectCode(e.target.value)}
                  placeholder="เช่น PJ-67-005"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {customerName && (
                <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  โรงพยาบาล / ลูกค้า: <strong className="text-slate-800">{customerName}</strong>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingProject}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs disabled:opacity-50"
                >
                  {savingProject ? 'กำลังสร้าง...' : 'สร้างและเลือกโครงการ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Signature Pad Modal */}
      <SignaturePadModal
        isOpen={signModalConfig.isOpen}
        title={signModalConfig.title}
        onClose={() => setSignModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onSave={signModalConfig.onSave}
      />

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        onImport={handleImportExcelItems}
        categories={categories.map((c) => ({ name: c.name }))}
      />

      {/* AI Extraction Modal */}
      <AiExtractModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        fileUrl={attachmentUrl}
        filename={attachmentName}
        onApplyData={handleApplyAiData}
      />
    </div>
  );
}
