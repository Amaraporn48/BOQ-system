'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { calculateDocumentTotals } from '@/lib/calculations';
import { serializeSitePhotos } from '@/lib/photoUtils';
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
import { ExcelBoqGrid, ExcelBoqRow, createEmptyExcelRow } from '@/components/ExcelBoqGrid';
import { categoriesToExcelRows, excelRowsToCategories } from '@/lib/excelBoqMapper';

interface BoqItemInput {
  id?: string;
  itemNo: number;
  description: string;
  specification: string;
  unit: string;
  quantity: number;
  materialPrice: number;
  materialAmount: number;
  laborPrice: number;
  laborAmount: number;
  unitPrice: number;
  amount: number;
  notes: string;
}

interface CategoryInput {
  name: string;
  items: BoqItemInput[];
}

function NewDocumentForm() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Form State (Default to BOQ)
  const docType = 'BOQ';
  const [documentNumber, setDocumentNumber] = useState('');
  const [isCustomDocNumber, setIsCustomDocNumber] = useState(false);
  const [title, setTitle] = useState('');
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [preparedBy, setPreparedBy] = useState('');
  const [preparedSignatureUrl, setPreparedSignatureUrl] = useState('');
  const [preparedDate, setPreparedDate] = useState(new Date().toISOString().slice(0, 10));

  const [checkedBy, setCheckedBy] = useState('');
  const [checkedSignatureUrl, setCheckedSignatureUrl] = useState('');
  const [checkedDate, setCheckedDate] = useState('');

  const [approvedBy, setApprovedBy] = useState('ผู้มีอำนาจลงนาม / AUTHORIZED SIGNATURE');
  const [approvedSignatureUrl, setApprovedSignatureUrl] = useState('');
  const [approvedDate, setApprovedDate] = useState(new Date().toISOString().slice(0, 10));

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

  // Project & Customer & Location
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
  const [attnName, setAttnName] = useState('ผู้จัดการฝ่ายวิศวกรรม');
  const [contactPerson, setContactPerson] = useState('พิษณุวัชร์ นันทวงศ์การ');
  const [contactPhone, setContactPhone] = useState('088-287-8259');
  const [sitePhotos, setSitePhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // File Attachment State (PDF, Excel, Scan, etc.)
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentSize, setAttachmentSize] = useState<number | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [creationMode, setCreationMode] = useState<'attachment' | 'table'>('table');
  const [attachmentGrandTotal, setAttachmentGrandTotal] = useState<number | ''>('');

  // Excel Import Modal State
  const [showExcelModal, setShowExcelModal] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingPhoto(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (res.ok && data.url) {
          uploadedUrls.push(data.url);
        }
      }

      if (uploadedUrls.length > 0) {
        setSitePhotos((prev) => [...prev, ...uploadedUrls]);
      } else {
        alert('อัปโหลดรูปภาพล้มเหลว');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const removePhoto = (idxToRemove: number) => {
    setSitePhotos((prev) => prev.filter((_, idx) => idx !== idxToRemove));
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

  // Terms
  const [paymentTerms, setPaymentTerms] = useState('- เบิกหลังส่งมอบงาน เครดิต 30 วัน');
  const [executionDuration, setExecutionDuration] = useState('30 วัน');
  const [warrantyDuration, setWarrantyDuration] = useState('1 ปี');
  const [notes, setNotes] = useState('ระยะเวลาในการดำเนินงาน 30 วัน');

  // Pricing & VAT & Overhead
  const [overheadRate, setOverheadRate] = useState(10.0);
  const [vatRate, setVatRate] = useState(7.0);
  const [isVatIncluded, setIsVatIncluded] = useState(false);
  const [discountType, setDiscountType] = useState<'PERCENT' | 'AMOUNT'>('PERCENT');
  const [discountValue, setDiscountValue] = useState(0);

  // Categories & Items
  const [categories, setCategories] = useState<CategoryInput[]>([
    {
      name: 'หมวดงานใหม่',
      items: [
        {
          itemNo: 1,
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
        },
      ],
    },
  ]);

  const [excelRows, setExcelRows] = useState<ExcelBoqRow[]>(() => [
    createEmptyExcelRow('category'),
    createEmptyExcelRow('item'),
  ]);

  const handleExcelRowsChange = (nextRows: ExcelBoqRow[]) => {
    setExcelRows(nextRows);
    setCategories(excelRowsToCategories(nextRows));
  };

  // Quick Add Location Modal
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationAddress, setNewLocationAddress] = useState('');
  const [newLocationNotes, setNewLocationNotes] = useState('');

  // Template Modal
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
    if (user && !preparedBy) {
      setPreparedBy(user.name);
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      Promise.all([
        fetch('/api/projects').then((r) => r.json()),
        fetch('/api/customers').then((r) => r.json()),
        fetch('/api/locations').then((r) => r.json()),
        fetch('/api/templates').then((r) => r.json()),
      ]).then(([p, c, l, t]) => {
        const projs = p.projects || [];
        const custs = c.customers || [];
        setProjects(projs);
        setCustomers(custs);
        setLocations(l.locations || []);
        setTemplates(t.templates || []);

        const initialProjId = searchParams.get('projectId');
        if (initialProjId) {
          const found = projs.find((x: any) => x.id === initialProjId);
          if (found) {
            setSelectedProjectId(found.id);
            setIsProjectJob(true);
            if (!title) setTitle(found.name);
            if (found.workingLocation) setWorkingLocation(found.workingLocation);
            if (found.customerId) {
              setSelectedCustomerId(found.customerId);
              const cust = custs.find((x: any) => x.id === found.customerId);
              if (cust) {
                setCustomerName(cust.name);
                setCustomerAddress(cust.address || '');
                setCustomerTaxId(cust.taxId || '');
              }
            }
          }
        }
      });
    }
  }, [user]);

  useEffect(() => {
    if (user && !isCustomDocNumber) {
      fetch(`/api/documents/next-number?type=${docType}&date=${documentDate}`)
        .then((r) => r.json())
        .then((numRes) => {
          if (numRes?.documentNumber) {
            setDocumentNumber(numRes.documentNumber);
          }
        })
        .catch(() => {});
    }
  }, [user, docType, documentDate, isCustomDocNumber]);

  // Auto-fill when Project changes
  const handleProjectChange = (projId: string) => {
    setSelectedProjectId(projId);
    const p = projects.find((x) => x.id === projId);
    if (p) {
      if (!title) setTitle(p.name);
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

  // Auto-fill when Customer changes
  const handleCustomerChange = (custId: string) => {
    setSelectedCustomerId(custId);
    const c = customers.find((x) => x.id === custId);
    if (c) {
      setCustomerName(c.name);
      setCustomerAddress(c.address || '');
      setCustomerTaxId(c.taxId || '');
    }
  };

  // Auto-fill when Location changes
  const handleLocationChange = (locId: string) => {
    setSelectedLocationId(locId);
    const l = locations.find((x) => x.id === locId);
    if (l) {
      setWorkingLocation(l.name);
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
        if (!title) setTitle(data.project.name);
      } else {
        alert(data.error || 'ไม่สามารถสร้างโครงการได้');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSavingProject(false);
    }
  };

  // Quick Add Location Handler
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
        alert('เพิ่มสถานที่ใหม่เรียบร้อยแล้ว');
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการสร้างสถานที่');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  // Apply Template Handler
  const handleApplyTemplate = (tpl: any) => {
    try {
      const parsed = typeof tpl.defaultItemsJson === 'string'
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
            materialPrice: Number(it.materialPrice) || 0,
            materialAmount: (Number(it.quantity) || 1) * (Number(it.materialPrice) || 0),
            laborPrice: Number(it.laborPrice) || 0,
            laborAmount: (Number(it.quantity) || 1) * (Number(it.laborPrice) || 0),
            unitPrice: Number(it.unitPrice) || 0,
            amount: (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
            notes: it.notes || '',
          })),
        }));
        setCategories(formatted);
        setExcelRows(categoriesToExcelRows(formatted));
        setShowTemplateModal(false);
      }
    } catch (err) {
      alert('ไม่สามารถโหลด Template ได้');
    }
  };

  // Category & Item operations
  const addCategory = () => {
    const nextIdx = categories.length + 1;
    setCategories([
      ...categories,
      {
        name: 'หมวดงานใหม่',
        items: [
          {
            itemNo: 1,
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
          },
        ],
      },
    ]);
  };

  const removeCategory = (cIdx: number) => {
    if (categories.length <= 1) {
      alert('ต้องมีหมวดงานอย่างน้อย 1 หมวด');
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
    const nextNo = copy[cIdx].items.length + 1;
    copy[cIdx].items.push({
      itemNo: nextNo,
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
    const nextNo = copy[cIdx].items.length + 1;
    copy[cIdx].items.splice(iIdx + 1, 0, {
      ...source,
      itemNo: nextNo,
      description: `${source.description} (สำเนา)`,
    });
    setCategories(copy);
  };

  const removeItem = (cIdx: number, iIdx: number) => {
    const copy = [...categories];
    if (copy[cIdx].items.length <= 1) {
      alert('แต่ละหมวดงานต้องมีรายการอย่างน้อย 1 รายการ');
      return;
    }
    copy[cIdx].items = copy[cIdx].items.filter((_, idx) => idx !== iIdx);
    // Renumber
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
    let nextCategories: CategoryInput[];
    if (targetCategoryIdx === -1) {
      nextCategories = [
        ...categories,
        {
          name: (newCatTitle || '').trim() || `หมวดงานนำเข้าจาก Excel (${new Date().toLocaleDateString('th-TH')})`,
          items: importedItems.map((it, idx) => ({ ...it, itemNo: idx + 1 })),
        },
      ];
    } else {
      const copy = [...categories];
      const curCat = copy[targetCategoryIdx];
      if (!curCat) return;

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
      nextCategories = copy;
    }

    setCategories(nextCategories);
    setExcelRows(categoriesToExcelRows(nextCategories));
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

  // Submit Handler
  const handleSubmit = async (e?: React.FormEvent, targetStatus: string = 'PENDING_REVIEW') => {
    if (e && e.preventDefault) e.preventDefault();
    if (!title.trim()) {
      alert('กรุณากรอกชื่องาน');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        documentNumber: documentNumber.trim() || undefined,
        documentType: docType,
        status: targetStatus,
        title: title.trim(),
        projectId: selectedProjectId || null,
        customerId: selectedCustomerId || null,
        locationId: selectedLocationId || null,
        customerName: customerName.trim() || null,
        customerAddress: customerAddress.trim() || null,
        customerTaxId: customerTaxId.trim() || null,
        workingLocation: workingLocation.trim() || null,
        attnName: attnName.trim() || null,
        contactPerson: contactPerson.trim() || null,
        contactPhone: contactPhone.trim() || null,
        sitePhotoUrl: serializeSitePhotos(sitePhotos),
        attachmentUrl: attachmentUrl.trim() || null,
        attachmentName: attachmentName.trim() || null,
        attachmentSize: attachmentSize || null,
        grandTotal: creationMode === 'attachment' ? (Number(attachmentGrandTotal) || 0) : undefined,
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

      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert(`บันทึกเอกสารเรียบร้อย! ได้รับเลขที่: ${data.document.documentNumber}`);
        router.push(`/documents/${data.document.id}`);
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย');
    } finally {
      setSaving(false);
    }
  };

  const filteredProjects = selectedCustomerId
    ? projects.filter((p) => !p.customerId || p.customerId === selectedCustomerId)
    : projects;

  if (loading || !user) return <div className="p-8 text-center text-slate-400">กำลังโหลด...</div>;

  return (
    <div className="flex-1 flex flex-col pb-24">
      <Header
        title="สร้าง BOQ ใหม่ (New BOQ)"
        subtitle="กรอกข้อมูลโครงการ รายการงาน BOQ และเงื่อนไขทางการค้า"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/documents"
              className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              ยกเลิก
            </Link>
            <button
              type="button"
              onClick={() => handleSubmit(undefined, 'PENDING_REVIEW')}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs disabled:opacity-50"
            >
              <span>📨</span>
              {saving ? 'กำลังบันทึก...' : 'ส่งรออนุมัติ'}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(undefined, 'APPROVED')}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'กำลังบันทึก...' : 'บันทึกอนุมัติทันที'}
            </button>
          </div>
        }
      />

      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Document Number Banner */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              เอกสาร BOQ (Bill of Quantities)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
              เลขที่เอกสาร:
            </label>
            <input
              type="text"
              value={documentNumber}
              onChange={(e) => {
                setIsCustomDocNumber(true);
                setDocumentNumber(e.target.value);
              }}
              placeholder="เช่น TW-67-001 หรือ TW-69-001"
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold text-blue-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 bg-white shadow-2xs"
            />
          </div>
        </div>

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

        {/* Section 1: Header Information */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              ข้อมูลโรงพยาบาล / ลูกค้า และโครงการ
            </h2>
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

          {/* 2. ชื่องาน และ สถานที่ปฏิบัติงาน */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่องาน <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น งานซ่อมบำรุงเปลี่ยนวาล์วดับเพลิง ชั้น 2"
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

          {/* Contact Person & Attention Box */}
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

          {/* Dates & Signatories */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                วันที่จัดทำเอกสาร
              </label>
              <input
                type="date"
                value={documentDate}
                onChange={(e) => setDocumentDate(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                ยืนราคาถึงวันที่ (Expiry)
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">ผู้จัดทำ</label>
              <input
                type="text"
                value={preparedBy}
                onChange={(e) => setPreparedBy(e.target.value)}
                placeholder="ชื่อผู้จัดทำ..."
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">ผู้ตรวจสอบ</label>
              <input
                type="text"
                value={checkedBy}
                onChange={(e) => setCheckedBy(e.target.value)}
                placeholder="ชื่อผู้ตรวจสอบ..."
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white"
              />
            </div>
          </div>
        </div>

        {/* Method 1: Original Document Attachment (Attachment Mode Only) */}
        {creationMode === 'attachment' && (
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
        )}

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
          {/* Section 2: Interactive BOQ Table (Excel Spreadsheet Mode) */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#107c41]" />
                ตารางรายการและรายละเอียดงาน (BOQ Items — สไตล์ Excel)
              </h2>
              <p className="text-xs text-slate-500">
                พิมพ์ เลื่อนช่องด้วยลูกศร/Tab/Enter ก๊อปปี้จาก Excel มาวางได้ตรงๆ และคำนวณยอดเงินอัตโนมัติ
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowExcelModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-300 transition shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                นำเข้าจาก Excel (คัดลอกมาวาง)
              </button>
            </div>
          </div>

          <ExcelBoqGrid rows={excelRows} onChange={handleExcelRowsChange} />

          {/* Pricing & VAT Summary Card */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Options */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                การคิดภาษีและส่วนลด
              </h3>

              {/* VAT Mode */}
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

              {/* Tax Exclusive vs Inclusive */}
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
                      <span>ราคายังไม่รวม VAT (คิด VAT เพิ่มเติม)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="isVatIncluded"
                        checked={isVatIncluded}
                        onChange={() => setIsVatIncluded(true)}
                        className="text-blue-600"
                      />
                      <span>ราคารวม VAT 7% แล้ว (ถอด VAT จากยอด)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Discount Input */}
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
                    placeholder="0"
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

        {/* Section 3: Commercial Terms */}
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
                placeholder="เช่น 45 วัน นับจากได้รับหนังสือแจ้งเริ่มงาน"
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
                placeholder="เช่น 1 ปี นับจากวันส่งมอบงาน"
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
                placeholder="เช่น งวดที่ 1 มัดจำ 30%, งวดที่ 2..."
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
              placeholder="ระบุข้อกำหนดเพิ่มเติม..."
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
            <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-blue-600" />
                รูปภาพประกอบหน้างาน / อุปกรณ์ (แนบได้หลายรูป)
              </span>
              {sitePhotos.length > 0 && (
                <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  แนบแล้ว {sitePhotos.length} รูป
                </span>
              )}
            </h4>
            <div className="flex flex-wrap items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploadingPhoto ? 'กำลังอัปโหลด...' : '+ เลือกรูปภาพจากเครื่อง (เลือกได้หลายรูป)'}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploadingPhoto}
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>

              {sitePhotos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSitePhotos([])}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบรูปทั้งหมด</span>
                </button>
              )}

              <span className="text-[11px] text-slate-400">
                รองรับไฟล์ JPG, PNG, WebP แนบได้หลายรูปพร้อมกันเพื่อแสดงในใบเสนอราคาและเอกสารแนบ
              </span>
            </div>

            {sitePhotos.length > 0 && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {sitePhotos.map((url, idx) => (
                  <div key={idx} className="relative group bg-slate-50 p-2 rounded-xl border border-slate-200 shadow-2xs hover:shadow-sm transition">
                    <div className="w-full h-28 rounded-lg overflow-hidden bg-white border border-slate-200 flex items-center justify-center">
                      <img
                        src={url}
                        alt={`รูปภาพประกอบ ${idx + 1}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-600 px-0.5">
                      <span className="font-semibold text-slate-700">รูปที่ {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="ลบรูปนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </>
        )}

        {/* Bottom Actions Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                เลือกปลายทางของการบันทึกเอกสาร
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                เลือกส่งเข้ากระบวนการรออนุมัติ (ไปแท็บรอ Approve) หรือบันทึกเก็บเป็นเอกสารที่อนุมัติแล้วทันที
              </p>
            </div>
            {attachmentUrl && (
              <div className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <span>📎 มีไฟล์แนบ BOQ: แนะนำให้เลือก "บันทึกส่งรออนุมัติ"</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Link
              href="/documents"
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              ยกเลิก
            </Link>

            <button
              type="button"
              onClick={() => handleSubmit(undefined, 'PENDING_REVIEW')}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs md:text-sm font-bold shadow-md disabled:opacity-50 transition cursor-pointer"
            >
              <span>📨</span>
              {saving ? 'กำลังบันทึก...' : 'บันทึกส่งรออนุมัติ (ไปแท็บรอ Approve)'}
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(undefined, 'APPROVED')}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-bold shadow-md disabled:opacity-50 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {saving ? 'กำลังบันทึก...' : 'บันทึกและอนุมัติทันที (เก็บในระบบเลย)'}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Add Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-600" />
                เพิ่มสถานที่ใหม่
              </h3>
              <button
                onClick={() => setShowLocationModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLocation} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ชื่อสถานที่ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  placeholder="เช่น อาคารผู้ป่วยนอก ชั้น 5 ห้องพักแพทย์"
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ที่อยู่สถานที่</label>
                <input
                  type="text"
                  value={newLocationAddress}
                  onChange={(e) => setNewLocationAddress(e.target.value)}
                  placeholder="ที่อยู่หรือจุดสังเกต..."
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">หมายเหตุสถานที่</label>
                <input
                  type="text"
                  value={newLocationNotes}
                  onChange={(e) => setNewLocationNotes(e.target.value)}
                  placeholder="เช่น ประตูทางเข้าขนของ Gate 2"
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  บันทึกสถานที่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Load Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                เลือกโหลดรายการจาก Template มาตรฐาน
              </h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {templates.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  ยังไม่มี Template ในระบบ
                </div>
              ) : (
                templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="p-4 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{tpl.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-800">
                          {tpl.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{tpl.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyTemplate(tpl)}
                      className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shrink-0"
                    >
                      เลือกใช้เทมเพลตนี้
                    </button>
                  </div>
                ))
              )}
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
    </div>
  );
}

export default function NewDocumentPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">กำลังโหลด...</div>}>
      <NewDocumentForm />
    </Suspense>
  );
}
