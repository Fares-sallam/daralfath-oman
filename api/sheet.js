// وسيط بين المتجر وجوجل شيتس — يشتغل على سيرفرات Vercel (اتصال سريع وثابت بجوجل من كل مكان)
// بدلاً من أن يتصل متصفح كل زائر بجوجل مباشرة (بطيء من بعض الدول)، يتصل بهذا الرابط القريب منه على شبكة Vercel

const SOURCES = {
    products: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSd2RDC6AtTWCiTkXKthey8tc9joRmVh4Vv3h3qJTv3FXtQQywcKvW1acW3U-ShLJhl7LJe_UhX1a9b/pub?output=csv",
    coupons: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSd2RDC6AtTWCiTkXKthey8tc9joRmVh4Vv3h3qJTv3FXtQQywcKvW1acW3U-ShLJhl7LJe_UhX1a9b/pub?gid=793714854&single=true&output=csv",
};

module.exports = async function handler(req, res) {
    const type = req.query.type;
    const url = SOURCES[type];

    if (!url) {
        res.status(400).send('نوع غير صالح');
        return;
    }

    try {
        const upstream = await fetch(url);
        const csv = await upstream.text();

        // كاش على شبكة Vercel: 5 دقائق طازج، ثم يخدم نسخة قديمة فوراً بينما يحدّث في الخلفية
        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.status(200).send(csv);
    } catch (err) {
        res.status(502).send('تعذر الاتصال بمصدر البيانات');
    }
}
