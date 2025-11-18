import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import fs from 'fs/promises';
import path from 'path';
import connectDB from '@/lib/db/connection';
import { WatiContact } from '@/lib/db/models';

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const limit = Math.max(1, Math.min(Number(searchParams.get('limit') || 10), 200));
  const skip = Math.max(0, Number(searchParams.get('skip') || 0));

  const query: any = {};
  if (q) {
    query.$or = [
      { firstName: { $regex: q, $options: 'i' } },
      { fullName: { $regex: q, $options: 'i' } },
      { phone: { $regex: q, $options: 'i' } }
    ];
  }

  const total = await WatiContact.countDocuments(query);

  // Fetch minimal fields and compute level from customParams if not set
  const docs = await WatiContact.find(query)
    .select('firstName fullName phone level customParams')
    .lean();

  const withLevel = docs.map((d: any) => {
    let derived = typeof d.level === 'number' ? d.level : undefined;
    if (derived === undefined && Array.isArray(d.customParams)) {
      const p = d.customParams.find((p: any) => String(p.name).toLowerCase() === 'level');
      if (p) {
        const n = Number(p.value);
        if (!Number.isNaN(n)) derived = n;
      }
    }
    return { ...d, level: typeof derived === 'number' ? derived : 0 };
  });

  withLevel.sort((a: any, b: any) => (b.level ?? 0) - (a.level ?? 0));
  const items = withLevel.slice(skip, skip + limit);

  return NextResponse.json({ items, total });
}

export async function POST(req: NextRequest) {
  // Import endpoint: reads JSON file from repo and upserts by phone/externalId
  await connectDB();
  try {
    const filePath = path.join(process.cwd(), 'src', 'app', 'data', 'wati_contacts.contacts.json');
    const file = await fs.readFile(filePath, 'utf8');
    const raw: any[] = JSON.parse(file);

    const ops = raw.map((r: any) => {
      const externalId = r.id || r._id?.$oid || undefined;
      const importedAt = r.importedAt?.$date ? String(r.importedAt.$date) : (typeof r.importedAt === 'string' ? r.importedAt : null);
      const lastUpdated = r.lastUpdated?.$date ? String(r.lastUpdated.$date) : (typeof r.lastUpdated === 'string' ? r.lastUpdated : null);

      // derive level from customParams
      let level: number = 0;
      if (Array.isArray(r.customParams)) {
        const levelParam = r.customParams.find((p: any) => String(p.name).toLowerCase() === 'level');
        if (levelParam) {
          const n = Number(levelParam.value);
          if (!Number.isNaN(n)) level = n;
        }
      }

      const doc: any = {
        wAid: r.wAid,
        allowBroadcast: r.allowBroadcast,
        allowSMS: r.allowSMS,
        channelId: r.channelId ?? null,
        channelType: r.channelType,
        contactLink: r.contactLink ?? null,
        contactLinkId: r.contactLinkId ?? null,
        contactStatus: r.contactStatus,
        created: r.created,
        ctwaFollowUpCount: r.ctwaFollowUpCount,
        ctwaFollowUpNotice: r.ctwaFollowUpNotice,
        ctwaFollowUpStatus: r.ctwaFollowUpStatus,
        currentFlowNodeId: r.currentFlowNodeId ?? null,
        customLabel: r.customLabel ?? null,
        customParams: r.customParams || [],
        deletedFromSMB: r.deletedFromSMB,
        displayId: r.displayId ?? null,
        displayName: r.displayName ?? null,
        firstName: r.firstName ?? null,
        fullName: r.fullName ?? null,
        externalId,
        igPhoneSource: r.igPhoneSource,
        importedAt,
        instagramConversationId: r.instagramConversationId ?? null,
        isDeleted: r.isDeleted,
        isInFlow: r.isInFlow,
        isInTestFlow: r.isInTestFlow,
        isSendBCLimit: r.isSendBCLimit,
        isShowCTWAFollowUpNotice: r.isShowCTWAFollowUpNotice,
        lastFlowId: r.lastFlowId ?? null,
        lastUpdated,
        messengerConversationId: r.messengerConversationId ?? null,
        messengerPageName: r.messengerPageName ?? '',
        mgPhoneSource: r.mgPhoneSource,
        operatorIds: r.operatorIds ?? null,
        optedIn: r.optedIn,
        paylinkSettings: r.paylinkSettings ?? null,
        phone: r.phone,
        photo: r.photo ?? null,
        regionCode: r.regionCode ?? null,
        segments: r.segments ?? null,
        selectedHubspotId: r.selectedHubspotId ?? null,
        source: r.source ?? null,
        tagName: r.tagName ?? null,
        teamIds: r.teamIds ?? null,
        tenantId: r.tenantId ?? null,
        waChannelPhone: r.waChannelPhone ?? null,
        level,
        city: r.city ?? null
      };

      const filter: any = {};
      if (doc.phone) filter.phone = doc.phone;
      if (!doc.phone && doc.externalId) filter.externalId = doc.externalId;
      if (Object.keys(filter).length === 0) filter._id = new (require('mongoose').Types.ObjectId)();

      return { updateOne: { filter, update: { $set: doc }, upsert: true } };
    });

    if (ops.length === 0) {
      return NextResponse.json({ imported: 0 }, { status: 200 });
    }

    const res = await WatiContact.bulkWrite(ops, { ordered: false });
    const imported = (res.upsertedCount || 0) + (res.modifiedCount || 0) + (res.insertedCount || 0);
    return NextResponse.json({ imported });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Import failed' }, { status: 500 });
  }
}

