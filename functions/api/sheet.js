// وسيط بين المتجر وجوجل شيتس على Cloudflare Pages Functions
// نفس فكرة api/sheet.js (نسخة Vercel) لكن بصيغة Cloudflare (Fetch API القياسية)

const SOURCES = {
    products: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSd2RDC6AtTWCiTkXKthey8tc9joRmVh4Vv3h3qJTv3FXtQQywcKvW1acW3U-ShLJhl7LJe_UhX1a9b/pub?output=csv",
    coupons: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSd2RDC6AtTWCiTkXKthey8tc9joRmVh4Vv3h3qJTv3FXtQQywcKvW1acW3U-ShLJhl7LJe_UhX1a9b/pub?gid=793714854&single=true&output=csv",
};

export async function onRequestGet(context) {
    const url = new URL(context.request.url);
    const type = url.searchParams.get('type');
    const source = SOURCES[type];

    if (!source) {
        return new Response('نوع غير صالح', { status: 400 });
    }

    try {
        const upstream = await fetch(source);
        const csv = await upstream.text();

        return new Response(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
            },
        });
    } catch (err) {
        return new Response('تعذر الاتصال بمصدر البيانات', { status: 502 });
    }
}
