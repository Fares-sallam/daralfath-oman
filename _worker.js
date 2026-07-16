// نقطة الدخول الرئيسية لـ Cloudflare Worker
// تخدم كل ملفات الموقع الثابتة، وتتولى وسيط بيانات جوجل شيتس عند /api/sheet

const SOURCES = {
    products: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSd2RDC6AtTWCiTkXKthey8tc9joRmVh4Vv3h3qJTv3FXtQQywcKvW1acW3U-ShLJhl7LJe_UhX1a9b/pub?output=csv",
    coupons: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSd2RDC6AtTWCiTkXKthey8tc9joRmVh4Vv3h3qJTv3FXtQQywcKvW1acW3U-ShLJhl7LJe_UhX1a9b/pub?gid=793714854&single=true&output=csv",
};

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (url.pathname === '/api/sheet') {
            const source = SOURCES[url.searchParams.get('type')];
            if (!source) return new Response('نوع غير صالح', { status: 400 });

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

        return env.ASSETS.fetch(request);
    }
};
