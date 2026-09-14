const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwwkawnZuZftGVEPyZud3XgWpqa2_iNFqfFR2r_wEgGjRfb8ybXOtrS_gsXmbVE4YVl/exec';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const firstName = String(data.firstName || '').trim();
    const lastName = String(data.lastName || '').trim();
    const email = String(data.email || '').trim();
    const attending = String(data.attending || '').trim();

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!firstName || !lastName || !emailPattern.test(email) || !['yes', 'no'].includes(attending)) {
      return res.status(400).json({ success: false, error: 'Please complete your name, email, and attendance response.' });
    }

    const adults = attending === 'yes' ? Number.parseInt(data.adultCount, 10) : 0;
    const children = attending === 'yes' ? Number.parseInt(data.childCount || '0', 10) : 0;

    if (attending === 'yes' && (!Number.isInteger(adults) || adults < 1 || adults > 6 || !Number.isInteger(children) || children < 0 || children > 6)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid adult and child count.' });
    }

    const childrenDetails = attending === 'yes' && children > 0 ? String(data.childrenDetails || '').trim() : '';
    if (attending === 'yes' && children > 0 && !childrenDetails) {
      return res.status(400).json({ success: false, error: "Please add the children's names and ages." });
    }

    let mealSelections = [];
    if (attending === 'yes') {
      try {
        mealSelections = Array.isArray(data.mealSelections)
          ? data.mealSelections
          : JSON.parse(String(data.mealSelections || '[]'));
      } catch {
        mealSelections = [];
      }

      if (!Array.isArray(mealSelections) || mealSelections.length !== adults + children) {
        return res.status(400).json({ success: false, error: 'Please complete a dinner selection for every guest.' });
      }

      for (const guest of mealSelections) {
        const name = String(guest?.name || '').trim();
        const meal = String(guest?.meal || '').trim();
        const type = String(guest?.type || '').trim();
        if (!name || !['adult', 'child'].includes(type) || !['Steak', 'Fish'].includes(meal)) {
          return res.status(400).json({ success: false, error: 'Please complete each guest name and dinner selection.' });
        }
        if (type === 'child' && !String(guest?.age || '').trim()) {
          return res.status(400).json({ success: false, error: "Please add each child's age." });
        }
      }
    }

    const primaryMeal = attending === 'yes'
      ? String(mealSelections.find(guest => guest?.key === 'primary')?.meal || '').trim()
      : '';

    const mealSelectionSummary = attending === 'yes'
      ? mealSelections.map(guest => {
          const name = String(guest.name || '').trim();
          const age = guest.type === 'child' && String(guest.age || '').trim() ? ` (${String(guest.age).trim()})` : '';
          return `${name}${age} — ${String(guest.meal || '').trim()}`;
        }).join(' | ')
      : '';

    const payload = {
      responseId: String(data.responseId || '').trim(),
      firstName,
      lastName,
      email,
      attending,
      partySize: attending === 'yes' ? String(adults + children) : '0',
      adultCount: String(adults),
      childCount: String(children),
      childrenDetails,
      mealChoice: primaryMeal,
      mealSelections: mealSelectionSummary,
      guestNames: attending === 'yes' ? String(data.guestNames || '').trim() : '',
      dietary: attending === 'yes' ? String(data.dietary || '').trim() : '',
      note: String(data.note || '').trim()
    };

    const googleResponse = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    const text = await googleResponse.text();
    if (!googleResponse.ok) {
      console.error('Google Apps Script error:', googleResponse.status, text);
      return res.status(502).json({ success: false, error: 'Unable to save RSVP right now.' });
    }

    let result;
    try { result = JSON.parse(text); }
    catch { result = { success: true, responseId: payload.responseId }; }

    if (result.success === false) {
      return res.status(502).json({ success: false, error: result.error || 'Unable to save RSVP right now.' });
    }

    return res.status(200).json({ success: true, responseId: result.responseId || payload.responseId });
  } catch (error) {
    console.error('RSVP submission failed:', error);
    return res.status(500).json({ success: false, error: 'Unable to save RSVP right now.' });
  }
};
