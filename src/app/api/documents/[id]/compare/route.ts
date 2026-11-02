import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const { searchParams } = new URL(request.url);
    const revAId = searchParams.get('revA');
    const revBId = searchParams.get('revB');

    if (!revAId || !revBId) {
      return NextResponse.json({ error: 'กรุณาระบุ Revision ทั้งสองฉบับที่ต้องการเปรียบเทียบ' }, { status: 400 });
    }

    const [revisionA, revisionB] = await Promise.all([
      prisma.documentRevision.findUnique({
        where: { id: revAId },
        include: {
          createdBy: { select: { name: true } },
          categories: {
            orderBy: { orderIndex: 'asc' },
            include: { items: { orderBy: { orderIndex: 'asc' } } },
          },
        },
      }),
      prisma.documentRevision.findUnique({
        where: { id: revBId },
        include: {
          createdBy: { select: { name: true } },
          categories: {
            orderBy: { orderIndex: 'asc' },
            include: { items: { orderBy: { orderIndex: 'asc' } } },
          },
        },
      }),
    ]);

    if (!revisionA || !revisionB) {
      return NextResponse.json({ error: 'ไม่พบข้อมูล Revision ที่ระบุ' }, { status: 404 });
    }

    // Flatten items for both
    const itemsA = revisionA.categories.flatMap((cat) =>
      cat.items.map((it) => ({
        ...it,
        categoryName: cat.name,
      }))
    );

    const itemsB = revisionB.categories.flatMap((cat) =>
      cat.items.map((it) => ({
        ...it,
        categoryName: cat.name,
      }))
    );

    // Compute diff: match items by description or itemNo
    const matchedB = new Set<string>();
    const itemDiffs: any[] = [];

    itemsA.forEach((a) => {
      // Find matching item in B by description
      const match = itemsB.find(
        (b) => !matchedB.has(b.id) && b.description.trim() === a.description.trim()
      );

      if (match) {
        matchedB.add(match.id);
        const qtyChanged = a.quantity !== match.quantity;
        const priceChanged = a.unitPrice !== match.unitPrice;
        const specChanged = a.specification !== match.specification;
        const unitChanged = a.unit !== match.unit;
        const isModified = qtyChanged || priceChanged || specChanged || unitChanged;

        itemDiffs.push({
          type: isModified ? 'MODIFIED' : 'UNCHANGED',
          category: a.categoryName,
          description: a.description,
          itemA: a,
          itemB: match,
          deltaAmount: match.amount - a.amount,
          changes: {
            quantity: qtyChanged ? { from: a.quantity, to: match.quantity } : null,
            unitPrice: priceChanged ? { from: a.unitPrice, to: match.unitPrice } : null,
            specification: specChanged ? { from: a.specification, to: match.specification } : null,
          },
        });
      } else {
        // Deleted in B
        itemDiffs.push({
          type: 'REMOVED',
          category: a.categoryName,
          description: a.description,
          itemA: a,
          itemB: null,
          deltaAmount: -a.amount,
        });
      }
    });

    // Added in B
    itemsB.forEach((b) => {
      if (!matchedB.has(b.id)) {
        itemDiffs.push({
          type: 'ADDED',
          category: b.categoryName,
          description: b.description,
          itemA: null,
          itemB: b,
          deltaAmount: b.amount,
        });
      }
    });

    // Totals comparison
    const summary = {
      subtotalA: revisionA.subtotal,
      subtotalB: revisionB.subtotal,
      subtotalDiff: revisionB.subtotal - revisionA.subtotal,

      discountA: revisionA.discountAmount,
      discountB: revisionB.discountAmount,
      discountDiff: revisionB.discountAmount - revisionA.discountAmount,

      vatA: revisionA.vatAmount,
      vatB: revisionB.vatAmount,
      vatDiff: revisionB.vatAmount - revisionA.vatAmount,

      grandTotalA: revisionA.grandTotal,
      grandTotalB: revisionB.grandTotal,
      grandTotalDiff: revisionB.grandTotal - revisionA.grandTotal,

      termsA: revisionA.paymentTerms,
      termsB: revisionB.paymentTerms,
      termsChanged: revisionA.paymentTerms !== revisionB.paymentTerms,

      durationA: revisionA.executionDuration,
      durationB: revisionB.executionDuration,
      durationChanged: revisionA.executionDuration !== revisionB.executionDuration,

      warrantyA: revisionA.warrantyDuration,
      warrantyB: revisionB.warrantyDuration,
      warrantyChanged: revisionA.warrantyDuration !== revisionB.warrantyDuration,
    };

    return NextResponse.json({
      revisionA: {
        id: revisionA.id,
        code: revisionA.revisionCode,
        reason: revisionA.revisionReason,
        createdBy: revisionA.createdBy.name,
        date: revisionA.documentDate,
      },
      revisionB: {
        id: revisionB.id,
        code: revisionB.revisionCode,
        reason: revisionB.revisionReason,
        createdBy: revisionB.createdBy.name,
        date: revisionB.documentDate,
      },
      summary,
      itemDiffs,
    });
  } catch (error) {
    console.error('Compare revisions error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการเปรียบเทียบ Revision' }, { status: 500 });
  }
}
