import os, json, urllib.request, urllib.error, datetime, random

random.seed(11)
TOKEN = os.environ['SUPABASE_ACCESS_TOKEN']

def q(sql):
    d = json.dumps({"query": sql}).encode()
    r = urllib.request.Request('https://api.supabase.com/v1/projects/atirgzxlmxwqjhzqfyfa/database/query',
        data=d, headers={'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json'})
    try:
        return json.loads(urllib.request.urlopen(r).read().decode())
    except urllib.error.HTTPError as e:
        raise Exception(f'SQL failed ({e.code}): {e.read().decode()[:250]}\nSQL: {sql[:150]}')

def esc(v):
    if v is None: return 'NULL'
    if isinstance(v, bool): return 'true' if v else 'false'
    if isinstance(v, (int, float)): return str(v)
    return "'" + str(v).replace("'", "''") + "'"

def upd(table, rid, cols):
    sets = ', '.join(f"{c} = {esc(v)}" for c, v in cols.items())
    q(f"UPDATE {table} SET {sets} WHERE id = '{rid}';")

today = datetime.date(2026, 10, 4)

# ---------- AGENCIES ----------
ags = q("select id, name, country from agencies;")
AG = {}
for a in ags:
    key = 'pk' if a['country'] == 'Pakistan' else 'ae' if a['country'] == 'United Arab Emirates' else 'sa'
    AG[key] = a['id']
conf = {
 'pk': dict(smtp_host='smtp.gmail.com', smtp_user='alnoortravels.pk@gmail.com', smtp_password='demo-smtp-app-password',
    smtp_from_name='Al-Noor Travel & Tours', smtp_from_email='info@alnoortravels.pk', tax_no='NTN 4451120-6',
    kelviq_customer_id='kq_demo_alnoor', kelviq_subscription_id='kq_sub_demo_alnoor'),
 'ae': dict(smtp_host='smtp.gmail.com', smtp_user='emiratesziyarah@gmail.com', smtp_password='demo-smtp-app-password',
    smtp_from_name='Emirates Ziyarah Travel', smtp_from_email='bookings@emiratesziyarah.ae', tax_no='TRN 100234567800003',
    kelviq_customer_id='kq_demo_emirates', kelviq_subscription_id='kq_sub_demo_emirates'),
 'sa': dict(smtp_host='smtp.gmail.com', smtp_user='haramaintravel.sa@gmail.com', smtp_password='demo-smtp-app-password',
    smtp_from_name='Haramain Travel Co.', smtp_from_email='reservations@haramaintravel.sa', tax_no='VAT 310123456700003',
    kelviq_customer_id='kq_demo_haramain', kelviq_subscription_id='kq_sub_demo_haramain'),
}
for k, aid in AG.items():
    upd('agencies', aid, {**conf[k],
        'logo_url': 'agency-assets/platform/logo.png',
        'nusuk_api_url': 'https://api.nusuk.sa', 'nusuk_api_key': 'demo-not-connected',
        'stripe_customer_id': 'n/a (Kelviq)', 'stripe_subscription_id': 'n/a (Kelviq)',
        'trial_ends_at': '2026-10-01'})
print('agencies filled')

# ---------- PROFILES ----------
accents = {'pk': '#0E7490', 'ae': '#B08D57', 'sa': '#046A38'}
staff_names = {'pk': 'Ayesha Siddiqua', 'ae': 'Rahul Menon', 'sa': 'Yousef Al Harbi'}
for p in q("select id, email, agency_id from profiles;"):
    cols = {'portal_accent': '#b8923f'}
    for k, aid in AG.items():
        if p['agency_id'] == aid:
            cols = {'portal_accent': accents[k]}
    upd('profiles', p['id'], cols)
print('profiles filled')

def ag_of(aid):
    return next(k for k, v in AG.items() if v == aid)

# ---------- CUSTOMERS ----------
POST = {'Lahore':'54000','Karachi':'74000','Islamabad':'44000','Faisalabad':'38000','Multan':'60000','Rawalpindi':'46000',
        'Gujranwala':'52250','Sialkot':'51310','Dubai':'00000','Abu Dhabi':'00000','Sharjah':'00000','Ajman':'00000',
        'Riyadh':'12345','Jeddah':'23434','Dammam':'32241','Makkah':'24231','Taif':'26521'}
KIN = {'pk': [('Muhammad Yaqoob','+92 300 112 3344'),('Shabana Begum','+92 321 445 8890'),('Tariq Mehmood','+92 333 220 1199')],
       'ae': [('Shahid Baig','+971 50 112 3344'),('Lakshmi Rajagopal','+971 55 445 8890'),('Hassan Al Sayed','+971 52 220 1199')],
       'sa': [('Ibrahim Al Dosari','+966 55 112 3344'),('Mohammed Al Qahtani','+966 53 445 8890'),('Saad Al Harbi','+966 50 220 1199')]}
NOTES_C = ['Regular customer since 2023. Prefers premium hotels near Haram.',
           'Family traveller — always books quad sharing. Send WhatsApp updates only.',
           'Sensitive to price; offer installment plans.',
           'VIP client. Wants private transfers and front-row hotel views.',
           'Referred by an existing customer. Very cooperative on documents.',
           'Elderly parents travelling — needs wheelchair assistance at airports.',
           'Prefers morning flights and half-board meal plans.',
           'Corporate client — invoices must include VAT number.']
i = 0
for c in q("select id, agency_id, city, full_name from customers order by created_at;"):
    k = ag_of(c['agency_id'])
    kin = KIN[k][i % len(KIN[k])]
    upd('customers', c['id'], {'notes': NOTES_C[i % len(NOTES_C)],
        'next_of_kin_name': kin[0], 'next_of_kin_phone': kin[1],
        'postal_code': POST.get(c['city'] or '', '00000')})
    i += 1
print('customers filled')

# ---------- LEADS ----------
for l in q("select id, full_name from leads where email is null or email = '';"):
    email = l['full_name'].lower().replace(' ', '.').replace('.', '.', 1) + '@gmail.com'
    upd('leads', l['id'], {'email': email})
print('leads filled')

# ---------- SALE MODULES ----------
def fill_sale(table, base_note):
    rows = q(f"select * from {table} order by created_at;")
    for n, r in enumerate(rows):
        k = ag_of(r['agency_id'])
        cols = {}
        # custom_data
        if not r.get('custom_data'): cols['custom_data'] = '{}'
        # sold_by
        if not r.get('sold_by'): cols['sold_by'] = staff_names[k]
        # dates
        for f, default in (('issue_date', '2026-10-01'), ('due_date', '2026-10-20'), ('follow_up_date', '2026-10-10')):
            if f in r and not r.get(f): cols[f] = default
        # notes
        if base_note and 'notes' in r and not r.get('notes'): cols['notes'] = base_note[n % len(base_note)]
        if cols: upd(table, r['id'], cols)

fill_sale('flight_sales', [
  'Confirmed group booking. Tickets issued via IATA agent portal.',
  'Balance reminder sent on WhatsApp. Customer confirmed transfer this week.',
  'Corporate booking — invoice includes VAT. Tickets emailed to customer.',
  'Price-sensitive client; applied negotiated fare. Monitor for schedule change.',
  'Repeat customer. Free date-change applied once.'])

print('flight_sales filled')

# visa specifics first
vrows = q("select * from visa_sales order by created_at;")
SPONSOR = {'pk': 'Muhammad Imran Sheikh', 'ae': 'Faisal Abdul Rahman', 'sa': 'Abdullah Al Otaibi'}
VNOTES = ['e-Visa processed via Nusuk partner portal. Documents complete.',
          'Application submitted; passport lodged at center. Follow up weekly.',
          'Issued and emailed to customer. Insurance included in package.',
          'Documents under review — customer to provide bank statement.']
for n, r in enumerate(vrows):
    k = ag_of(r['agency_id'])
    cols = {}
    if not r.get('visa_no'): cols['visa_no'] = f"{'U' if k=='pk' else 'E' if k=='ae' else 'S'}{random.randint(10000000, 99999999)}"
    if not r.get('sponsor_name'): cols['sponsor_name'] = SPONSOR[k]
    if not r.get('processing_speed'): cols['processing_speed'] = 'standard' if n % 2 else 'express'
    if not r.get('processing_center'): cols['processing_center'] = 'Dubai'
    if not r.get('issued_date'):
        d = datetime.date.fromisoformat(r['application_date'] or '2026-09-20')
        cols['issued_date'] = (d + datetime.timedelta(days=10)).isoformat()
    if not r.get('expiry_date'):
        d = datetime.date.fromisoformat(str(cols.get('issued_date') or r['issued_date'] or '2026-09-25'))
        cols['expiry_date'] = (d + datetime.timedelta(days=90)).isoformat()
    if not r.get('insurance_expiry'):
        d = datetime.date.fromisoformat(str(cols.get('expiry_date') or r['expiry_date']))
        cols['insurance_expiry'] = (d + datetime.timedelta(days=90)).isoformat()
    if not r.get('insurance'): cols['insurance'] = 'included'
    if not r.get('nusuk_ref'): cols['nusuk_ref'] = 'N/A (offline)'
    if not r.get('nusuk_status'): cols['nusuk_status'] = 'n/a'
    if not r.get('nusuk_submitted_at'): cols['nusuk_submitted_at'] = (r['application_date'] or '2026-09-20') + ' 10:00:00+03'
    if not r.get('notes'): cols['notes'] = VNOTES[n % len(VNOTES)]
    if not r.get('custom_data'): cols['custom_data'] = '{}'
    upd('visa_sales', r['id'], cols)
print('visa_sales filled')

fill_sale('hotel_sales', [
  'Direct hotel contract — 10% agency margin. Confirmation forwarded to customer.',
  'Half-board included. Customer requested high floor; noted in booking.',
  'Non-refundable after free-cancellation window. Balance follow-up scheduled.',
  'Rooms block confirmed. Vouchers will be issued 48h before check-in.'])

fill_sale('transport_sales', [])
trows = q("select * from transport_sales order by created_at;")
TNOTES = ['Meet & greet included. Driver will hold a name sign at arrivals.',
          'Vehicle sanitized and luggage space confirmed for all passengers.',
          'Round-trip booked; return pickup reconfirmed 24h before flight.',
          'Day-use vehicle for ziyarat program with English-speaking guide.']
VEH = ['GMC Yukon XL · ATB-4821', 'Toyota Hiace · KTW-2290', 'Coaster 30-seater · AHC-1173', 'GMC Suburban · RVB-9012']
GUIDE = {'pk': 'Hafiz Zubair Ahmed', 'ae': 'Ustad Karim Mansour', 'sa': 'Sheikh Saleh Al Qarni'}
for n, r in enumerate(trows):
    k = ag_of(r['agency_id'])
    cols = {}
    if not r.get('transport_time'): cols['transport_time'] = ['08:00', '11:30', '15:00', '18:30', '21:45'][n % 5]
    if not r.get('flight_no'): cols['flight_no'] = '—'
    if not r.get('supplier'): cols['supplier'] = 'Haramain Transport Co.'
    if not r.get('vehicle_no'): cols['vehicle_no'] = VEH[n % len(VEH)]
    if not r.get('return_date'):
        d = datetime.date.fromisoformat(str(r['transport_date']))
        cols['return_date'] = (d + datetime.timedelta(days=5)).isoformat()
    if not r.get('guide_name'): cols['guide_name'] = GUIDE[k] if 'ziyarat' in str(r['transport_type']) else '—'
    if not r.get('notes'): cols['notes'] = TNOTES[n % len(TNOTES)]
    upd('transport_sales', r['id'], cols)
print('transport_sales filled')

prows = q("select * from package_sales order by created_at;")
PNOTES = ['Full package: flights, hotels, transfers and ziyarat included.',
          'Deposit received; balance due before ticket issuance.',
          'Group leader confirmed. Rooming list finalized.',
          'Ziyarat program shared with customer for approval.']
for n, r in enumerate(prows):
    k = ag_of(r['agency_id'])
    cols = {}
    cat = r.get('package_category')
    if not r.get('tour_destination'):
        cols['tour_destination'] = 'Jeddah — Red Sea corniche tour' if cat == 'tour' else '—'
    if not r.get('tour_hotel'):
        cols['tour_hotel'] = 'Jeddah Hilton' if cat == 'tour' else '—'
    if not r.get('tour_nights'):
        cols['tour_nights'] = 2 if cat == 'tour' else 0
    if not r.get('ziyarat_date'):
        d = datetime.date.fromisoformat(str(r['departure_date']))
        cols['ziyarat_date'] = (d + datetime.timedelta(days=3)).isoformat()
    if not r.get('notes'): cols['notes'] = PNOTES[n % len(PNOTES)]
    upd('package_sales', r['id'], cols)
fill_sale('package_sales', [])
print('package_sales filled')

# ---------- BOOKINGS ----------
BNOTES = ['Booking confirmed after deposit. Vouchers sent via email.',
          'Standard terms: full payment 14 days before departure.',
          'Customer reviewing room sharing options before final confirmation.']
for n, b in enumerate(q("select id from bookings order by created_at;")):
    upd('bookings', b['id'], {'notes': BNOTES[n % len(BNOTES)]})
print('bookings filled')

# ---------- QUOTATIONS ----------
bks = q("select id, customer_id, agency_id, booking_ref from bookings;")
for qt in q("select id, agency_id, customer_id from quotations where booking_id is null;"):
    match = next((b['id'] for b in bks if b['agency_id'] == qt['agency_id'] and b['customer_id'] == qt['customer_id']), None)
    cols = {'notes': 'Quotation valid until date shown. 30% deposit confirms the booking.'}
    if match: cols['booking_id'] = match
    upd('quotations', qt['id'], cols)
print('quotations filled')

# ---------- TASKS ----------
bks_by_ag = {}
for b in bks: bks_by_ag.setdefault(b['agency_id'], []).append(b)
TASKD = {'Collect balance': 'Check bank statement before marking paid.',
         'Submit': 'Verify passport copies and photos are attached.',
         'Send Ramzan': 'Attach QT-PK-2026-001 pricing with installment plan.',
         'Confirm November': '30 seats blocked on SV716; deposit paid to airline.',
         'Chase Nusuk': 'Daily follow-up until status changes to issued.',
         'Prepare Hajj': 'Include VIP tent photos and muftawiyah service list.',
         'Send November hotel options': 'Two options: half-board and room-only.',
         'Reconcile September payroll': 'Bank transfer batch confirmed with finance.',
         'Collect balance from Hessa': 'Customer confirmed transfer this week.',
         'Arrange Taif resort vehicle': 'Camry confirmed; driver assigned.',
         'Follow up expat visa documents': 'Dammam center appointment needed.',
         'Publish Taif weekend package': 'Live on public showcase page.'}
for t in q("select id, title, agency_id, description, related_booking_id from tasks;"):
    cols = {}
    if not t['description']:
        for kw, d in TASKD.items():
            if t['title'].startswith(kw): cols['description'] = d
        if 'description' not in cols: cols['description'] = 'Follow up as per standard workflow.'
    if not t['related_booking_id'] and t['agency_id'] in bks_by_ag:
        cols['related_booking_id'] = bks_by_ag[t['agency_id']][0]['id']
    if cols: upd('tasks', t['id'], cols)
print('tasks filled')

# ---------- DOCUMENTS ----------
DOCN = ['Verified against passport — no discrepancies.', 'Copy emailed to customer for records.',
        'Original held at office safe.', 'Expiry tracked; reminder set 60 days before.']
for n, d in enumerate(q("select id, doc_type, expiry_date, customer_id, notes, booking_id from documents order by created_at;")):
    cols = {}
    if not d['notes']: cols['notes'] = DOCN[n % len(DOCN)]
    if not d['expiry_date'] and d['doc_type'] in ('passport', 'visa'):
        cols['expiry_date'] = '2030-06-15'
    if not d['booking_id'] and d['customer_id']:
        match = next((b['id'] for b in bks if b['customer_id'] == d['customer_id']), None)
        if match: cols['booking_id'] = match
    if cols: upd('documents', d['id'], cols)
print('documents filled')

# ---------- EMPLOYEES ----------
NID = {'pk': lambda: f"35202-{random.randint(1000000, 9999999)}-{random.randint(1, 9)}",
       'ae': lambda: f"784-1990-{random.randint(1000000, 9999999)}-1",
       'sa': lambda: f"1{random.randint(100000000, 999999999)}"}
BANK = {'pk': ('Meezan Bank', 'MEBNPKKA'), 'ae': ('Emirates NBD', 'EMIRATNBD'), 'sa': ('Al Rajhi Bank', 'RJHISARI')}
ENOTES = ['Consistent top performer. Bonus candidate for the year.',
          'Reliable and punctual; handles peak-season load well.',
          'Recently completed service training. Growing into the role.',
          'Strong with customers; keeps satisfaction scores high.']
for n, e in enumerate(q("select id, agency_id, full_name from employees order by created_at;")):
    k = ag_of(e['agency_id'])
    bank, code = BANK[k]
    name = e['full_name'].replace(' ', '+')
    upd('employees', e['id'], {
        'notes': ENOTES[n % len(ENOTES)],
        'photo_url': f'https://ui-avatars.com/api/?name={name}&background=B08D57&color=fff&size=128',
        'contract_path': f'/documents/contracts/{name.lower()}-contract-2026.pdf',
        'national_id': NID[k](),
        'account_no': f'**{random.randint(1000, 9999)}',
        'bank_code': code})
print('employees filled')

# ---------- PAYROLL ----------
for p in q("select id, status from payroll;"):
    upd('payroll', p['id'], {'notes': 'September 2026 payroll — includes housing & transport allowances.' if p['status'] == 'paid' else 'October 2026 draft — pending finance approval.'})
print('payroll filled')

# ---------- ATTENDANCE ----------
for a in q("select id, notes from attendance where notes is null;"):
    upd('attendance', a['id'], {'notes': 'Regular shift.'})
print('attendance filled')

print('FILL COMPLETE')
