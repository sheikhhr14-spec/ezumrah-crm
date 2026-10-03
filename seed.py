import os, json, urllib.request, urllib.error, uuid, datetime, random

random.seed(7)
TOKEN = os.environ['SUPABASE_ACCESS_TOKEN']
SB_URL = 'https://atirgzxlmxwqjhzqfyfa.supabase.co'
SERVICE_KEY = [l.split('=',1)[1].strip() for l in open('/app/conversations/6a934d2197674e56c09a46ae/crm/.env.local') if l.startswith('SUPABASE_SERVICE_ROLE_KEY=')][0]
SUPERADMIN_ID = 'd774c7da-ec49-4134-a807-c6f40944d526'

def q(sql):
    d = json.dumps({"query": sql}).encode()
    r = urllib.request.Request('https://api.supabase.com/v1/projects/atirgzxlmxwqjhzqfyfa/database/query',
        data=d, headers={'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json'})
    try:
        return json.loads(urllib.request.urlopen(r).read().decode())
    except urllib.error.HTTPError as e:
        raise Exception(f'SQL failed ({e.code}): {e.read().decode()[:300]}\nSQL: {sql[:200]}')

def esc(v):
    if v is None: return 'NULL'
    if isinstance(v, str) and v.startswith('RAW:'): return v[4:]
    if isinstance(v, bool): return 'true' if v else 'false'
    if isinstance(v, (int, float)): return str(v)
    return "'" + str(v).replace("'", "''") + "'"

def ins(table, rows):
    if not rows: return
    cols = list(rows[0].keys())
    for r in rows: assert set(r.keys()) == set(cols), (table, sorted(set(r) ^ set(cols)))
    vals = ',\n('.join(['('] * 0) or None
    body = ',\n'.join('(' + ', '.join(esc(r[c]) for c in cols) + ')' for r in rows)
    q(f"INSERT INTO {table} ({', '.join(cols)}) VALUES\n{body};")

def make_auth_user(email, password, full_name):
    d = json.dumps({'email': email, 'password': password, 'email_confirm': True, 'user_metadata': {'full_name': full_name}}).encode()
    r = urllib.request.Request(SB_URL + '/auth/v1/admin/users', data=d,
        headers={'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY, 'Content-Type': 'application/json'})
    try:
        resp = json.loads(urllib.request.urlopen(r).read().decode())
        return (resp.get('user') or resp).get('id')
    except urllib.error.HTTPError as e:
        if e.code in (400, 422):
            r2 = urllib.request.Request(SB_URL + f"/auth/v1/admin/users?email={urllib.parse.quote(email)}",
                headers={'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY})
            users = json.loads(urllib.request.urlopen(r2).read().decode()).get('users', [])
            if users: return users[0]['id']
        raise

import urllib.parse
def U(): return str(uuid.uuid4())
def arr(l): return '{' + ','.join(l) + '}'
today = datetime.date(2026, 10, 3)

RESUME = os.environ.get('SEED_RESUME') == '1'
AG, U_ = {}, {}
if RESUME:
    for r in q("select id, name from agencies;"):
        if r['name'].startswith('Al-Noor'): AG['pk'] = r['id']
        elif r['name'].startswith('Emirates'): AG['ae'] = r['id']
        elif r['name'].startswith('Haramain'): AG['sa'] = r['id']
    for r in q("select id, email from profiles where role <> 'superadmin';"):
        U_[r['email']] = r['id']
    _all = [r['table_name'] for r in q("select table_name from information_schema.tables where table_schema='public'")]
    data_tables = [t for t in _all if t not in ('agencies','profiles','kelviq_webhook_events')]
    q("TRUNCATE TABLE " + ', '.join(data_tables) + " CASCADE;")
    print('RESUME with agencies', len(AG), 'users', len(U_), '- data tables wiped')
CUR = {'pk': 'PKR', 'ae': 'AED', 'sa': 'SAR'}
today = datetime.date(2026, 10, 3)
if not RESUME:
    # ============ 1. WIPE ============
    keep = {'kelviq_webhook_events'}
    all_tables = [r['table_name'] for r in q("select table_name from information_schema.tables where table_schema='public'")]
    q("TRUNCATE TABLE " + ', '.join(t for t in all_tables if t not in keep) + " CASCADE;")
    q(f"DELETE FROM auth.users WHERE id <> '{SUPERADMIN_ID}';")
    q(f"INSERT INTO profiles (id, email, full_name, role, agency_id, modules) VALUES ('{SUPERADMIN_ID}', 'hamza@ezumrah.com', 'Hamza (Super Admin)', 'superadmin', NULL, NULL);")
    print('wipe done')

    # ============ 2. AUTH USERS ============
    accounts = [
        ('owner.pak@ezumrah.com', 'PakOwner@2026', 'Muhammad Imran Sheikh'),
        ('staff.pak@ezumrah.com', 'PakStaff@2026', 'Ayesha Siddiqua'),
        ('owner.dubai@ezumrah.com', 'DubaiOwner@2026', 'Faisal Abdul Rahman'),
        ('manager.dubai@ezumrah.com', 'DubaiMgr@2026', 'Sara Al Hashimi'),
        ('staff.dubai@ezumrah.com', 'DubaiStaff@2026', 'Rahul Menon'),
        ('staff2.dubai@ezumrah.com', 'DubaiStaff2@2026', 'Fatima Zahra'),
        ('owner.saudi@ezumrah.com', 'SaudiOwner@2026', 'Abdullah Al Otaibi'),
        ('staff.saudi@ezumrah.com', 'SaudiStaff@2026', 'Yousef Al Harbi'),
        ('staff2.saudi@ezumrah.com', 'SaudiStaff2@2026', 'Mansour Al Qahtani'),
    ]
    U_ = {e: make_auth_user(e, p, n) for e, p, n in accounts}
    print('auth users:', len(U_))

    # ============ 3. AGENCIES ============
    AG = {'pk': U(), 'ae': U(), 'sa': U()}
    period_end = (today + datetime.timedelta(days=30)).isoformat()
    CUR = {'pk': 'PKR', 'ae': 'AED', 'sa': 'SAR'}
    q(f"""INSERT INTO agencies (id, name, plan, subscription_status, current_period_end, seats, country, currency, timezone, tax_rate, brand_color, label, contact_email, contact_phone, address, website, created_at, updated_at) VALUES
    ('{AG['pk']}', 'Al-Noor Travel & Tours', 'standard', 'active', '{period_end}', 2, 'Pakistan', 'PKR', 'Asia/Karachi', 0, '#0E7490', 'Lahore · Pakistan', 'info@alnoortravels.pk', '+92 42 3575 8899', '12-C Main Boulevard, Gulberg III, Lahore', 'https://alnoortravels.pk', now(), now()),
    ('{AG['ae']}', 'Emirates Ziyarah Travel LLC', 'professional', 'active', '{period_end}', 5, 'United Arab Emirates', 'AED', 'Asia/Dubai', 0.05, '#B08D57', 'Dubai · UAE', 'bookings@emiratesziyarah.ae', '+971 4 385 2210', 'Office 1104, Al Maktoum Tower, Sheikh Zayed Rd, Dubai', 'https://emiratesziyarah.ae', now(), now()),
    ('{AG['sa']}', 'Haramain Travel Co.', 'professional', 'active', '{period_end}', 5, 'Saudi Arabia', 'SAR', 'Asia/Riyadh', 0.15, '#046A38', 'Jeddah · KSA', 'reservations@haramaintravel.sa', '+966 12 671 4400', 'Building 21, Andalus St, Jeddah 23434', 'https://haramaintravel.sa', now(), now());""")
    print('agencies done')

    # ============ 4. PROFILES ============
    BASE = ['leads','customers','bookings','packages','flights','hotels','visas','transports','documents','tasks','support']
    staff_mods, mgr_mods = arr(BASE), arr(BASE + ['invoices','quotations','reports'])
    def prof(email, name, role, ag, modules):
        return {'id': U_[email], 'agency_id': AG[ag], 'full_name': name, 'email': email, 'role': role, 'modules': modules, 'created_at': 'now()', 'updated_at': 'now()'}
    prows = [
        prof('owner.pak@ezumrah.com', 'Muhammad Imran Sheikh', 'owner', 'pk', None),
        prof('staff.pak@ezumrah.com', 'Ayesha Siddiqua', 'staff', 'pk', staff_mods),
        prof('owner.dubai@ezumrah.com', 'Faisal Abdul Rahman', 'owner', 'ae', None),
        prof('manager.dubai@ezumrah.com', 'Sara Al Hashimi', 'manager', 'ae', mgr_mods),
        prof('staff.dubai@ezumrah.com', 'Rahul Menon', 'staff', 'ae', staff_mods),
        prof('staff2.dubai@ezumrah.com', 'Fatima Zahra', 'staff', 'ae', staff_mods),
        prof('owner.saudi@ezumrah.com', 'Abdullah Al Otaibi', 'owner', 'sa', None),
        prof('staff.saudi@ezumrah.com', 'Yousef Al Harbi', 'staff', 'sa', staff_mods),
        prof('staff2.saudi@ezumrah.com', 'Mansour Al Qahtani', 'staff', 'sa', staff_mods),
    ]
    body = ',\n'.join('(' + ', '.join(esc(r[c]) for c in ['id','agency_id','full_name','email','role','modules','created_at','updated_at']) + ')' for r in prows)
    q(f"""INSERT INTO profiles (id, agency_id, full_name, email, role, modules, created_at, updated_at) VALUES
    {body}
    ON CONFLICT (id) DO UPDATE SET agency_id = EXCLUDED.agency_id, role = EXCLUDED.role, modules = EXCLUDED.modules, full_name = EXCLUDED.full_name;""")
    print('profiles done')


# ============ 5. CUSTOMERS ============
def cust(ag, name, email, phone, city, nationality, gender, title='Mr'):
    return {'id': U(), 'agency_id': AG[ag], 'full_name': name, 'email': email, 'phone': phone, 'whatsapp': phone,
            'country': {'pk':'Pakistan','ae':'United Arab Emirates','sa':'Saudi Arabia'}[ag], 'nationality': nationality,
            'gender': gender, 'title': title, 'city': city, 'source': random.choice(['referral','walk_in','website','whatsapp','instagram']),
            'passport_no': 'P' + str(random.randint(1000000, 9999999)), 'passport_expiry': '2030-06-15',
            'date_of_birth': '1985-03-12', 'address': city, 'created_at': 'now()', 'updated_at': 'now()'}
PKC = [cust('pk', n, e, p, c, 'Pakistani', g, t) for n, e, p, c, g, t in [
    ('Muhammad Asif Khan','asif.khan@gmail.com','+92 300 4451182','Lahore','male','Mr'),
    ('Rukhsana Bibi','rukhsana.b@gmail.com','+92 321 7712039','Karachi','female','Mrs'),
    ('Chaudhry Naveed Ahmed','naveed.ahmed@outlook.com','+92 333 5560091','Islamabad','male','Mr'),
    ('Farhat Naseem','farhat.naseem@gmail.com','+92 302 1107788','Faisalabad','female','Mrs'),
    ('Malik Sohail Akhtar','sohail.akhtar@yahoo.com','+92 345 9002213','Multan','male','Mr'),
    ('Shazia Perveen','shazia.p@gmail.com','+92 313 4420055','Rawalpindi','female','Mrs'),
    ('Hafiz Abdul Rehman','abdul.rehman@gmail.com','+92 331 7741190','Gujranwala','male','Mr'),
    ('Nadia Sharif','nadia.sharif@gmail.com','+92 348 2214677','Sialkot','female','Mrs')]]
AEC = [cust('ae', n, e, p, c, nat, g, t) for n, e, p, c, nat, g, t in [
    ('Imran Baig','imran.baig@gmail.com','+971 50 447 1182','Dubai','Pakistani','male','Mr'),
    ('Priya Rajagopal','priya.raj@gmail.com','+971 55 310 4402','Abu Dhabi','Indian','female','Mrs'),
    ('Omar Al Sayed','omar.alsayed@gmail.com','+971 52 885 7221','Sharjah','Egyptian','male','Mr'),
    ('Maria Santos','maria.santos@gmail.com','+971 56 220 9913','Dubai','Filipino','female','Mrs'),
    ('Ahmed Farooq Baig','ahmed.farooq@gmail.com','+971 50 771 6304','Ajman','Pakistani','male','Mr'),
    ('Leila Haddad','leila.haddad@gmail.com','+971 54 118 2244','Dubai','Lebanese','female','Mrs'),
    ('Syed Kamran Ali','kamran.ali@gmail.com','+971 55 442 6610','Dubai','Pakistani','male','Mr'),
    ('Ramesh Kumar','ramesh.kumar@gmail.com','+971 52 900 4478','Dubai','Indian','male','Mr')]]
SAC = [cust('sa', n, e, p, c, 'Saudi', g, t) for n, e, p, c, g, t in [
    ('Sheikh Salman Al Dosari','salman.dosari@gmail.com','+966 55 441 2208','Riyadh','male','Mr'),
    ('Muneera Al Qahtani','muneera.q@gmail.com','+966 53 771 4409','Jeddah','female','Mrs'),
    ('Fahad Al Shamri','fahad.shamri@gmail.com','+966 50 220 3391','Dammam','male','Mr'),
    ('Nora Al Shehri','nora.shehri@gmail.com','+966 56 118 7734','Makkah','female','Mrs'),
    ('Abdulaziz Al Zahrani','abdulaziz.z@gmail.com','+966 54 330 1120','Jeddah','male','Mr'),
    ('Hessa Al Mutairi','hessa.mutairi@gmail.com','+966 53 992 4488','Riyadh','female','Mrs'),
    ('Bandar Al Otaibi','bandar.otaibi@gmail.com','+966 55 662 9901','Taif','male','Mr'),
    ('Reem Al Ghamdi','reem.ghamdi@gmail.com','+966 56 004 2211','Jeddah','female','Mrs')]]
ins('customers', PKC + AEC + SAC)
C = {'pk': PKC, 'ae': AEC, 'sa': SAC}
print('customers done')

# ============ 6. PACKAGES ============
def pkg(ag, name, st, days, desc, price, public):
    return {'id': U(), 'agency_id': AG[ag], 'name': name, 'service_type': st, 'duration_days': days,
            'description': desc, 'price_from': price, 'currency': CUR[ag], 'is_active': True,
            'is_public': public, 'created_at': 'now()', 'updated_at': 'now()'}
ins('packages', [
    pkg('pk','14 Days Economy Umrah','umrah',14,'Direct flight from Lahore, 3-star Makkah hotel 300m from Haram, shared transport.',385000,True),
    pkg('pk','15 Days Premium Umrah','umrah',15,'Saudia direct, Hilton Convention Palace view rooms, private GMC transfers.',750000,True),
    pkg('pk','Ramzan 2027 · 20 Days','umrah',20,'Full Ramzan package with suhoor & iftar, Aziziyah then Makkah.',925000,True),
    pkg('pk','Ziyarat & City Tour','ziyarah',3,'Guided ziyarat of Makkah & Madinah with English-Urdu scholar.',35000,False),
    pkg('ae','10 Days Umrah Express','umrah',10,'FlyDubai direct from DXB, 4-star hotel near Haram, ideal for families.',4850,True),
    pkg('ae','14 Days Family Umrah','umrah',14,'Emirates flights, Swissotel Al Maqam Makkah, quad sharing, kids policy.',7900,True),
    pkg('ae','Jeddah City & Ziyarat','ziyarah',4,'Historic Jeddah tour plus ziyarat program with Arabic-English guide.',1450,False),
    pkg('ae','Hajj 2027 Premium','hajj',21,'Hajj permit, Mina A/C tents, full muftawiyah, VIP 5-star.',34500,True),
    pkg('sa','Madinah Spiritual Retreat','ziyarah',5,'5-star Madinah hotel facing Masjid Nabawi, scholar-led ziyarat.',4200,True),
    pkg('sa','Jeddah Corniche Holiday','holiday',3,'Red Sea resort weekend with airport transfer and breakfast.',1800,True),
    pkg('sa','Umrah for GCC Residents','umrah',7,'Full ground services for GCC residents: hotels, transport and guide.',2600,True),
    pkg('sa','Taif Summer Escape','holiday',2,'Cool Taif mountain resort, private vehicle from Jeddah.',950,False),
])
print('packages done')

# ============ 7. LEADS ============
def lead(ag, name, phone, email, src, interest, budget, status, assignee, notes):
    return {'id': U(), 'agency_id': AG[ag], 'full_name': name, 'phone': phone, 'whatsapp': phone, 'email': email,
            'country': {'pk':'Pakistan','ae':'United Arab Emirates','sa':'Saudi Arabia'}[ag], 'source': src,
            'interest': interest, 'budget': budget, 'status': status, 'assigned_to': U_[assignee],
            'notes': notes, 'created_at': 'now()', 'updated_at': 'now()'}
ins('leads', [
    lead('pk','Tariq Jameel','+92 321 5560998','tariq.j@gmail.com','website','umrah',400000,'new','staff.pak@ezumrah.com','Wants December departure for family of 4.'),
    lead('pk','Nasreen Akhtar','+92 300 1108821',None,'whatsapp','hajj',1200000,'contacted','owner.pak@ezumrah.com','Hajj 2027 enquiry, needs installment plan.'),
    lead('pk','Khalid Mehmood','+92 345 9927780','khalid.m@yahoo.com','referral','umrah',500000,'qualified','staff.pak@ezumrah.com','Referred by Asif Khan, wants premium package.'),
    lead('pk','Zubaida Bibi','+92 333 4410092',None,'walk_in','ziyarah',50000,'converted','staff.pak@ezumrah.com','Booked ziyarat city tour.'),
    lead('ae','Shahid Iqbal','+971 55 990 1120','shahid.iqbal@gmail.com','instagram','umrah',5000,'new','staff.dubai@ezumrah.com','Solo traveller, flexible dates.'),
    lead('ae','Aisha Verghese','+971 50 442 8811','aisha.v@gmail.com','website','umrah',7800,'contacted','manager.dubai@ezumrah.com','Family of 5, asked about quad rooms.'),
    lead('ae','Hussein Nasser','+971 52 118 3304',None,'whatsapp','hajj',30000,'qualified','owner.dubai@ezumrah.com','Hajj 2027 VIP tent interest.'),
    lead('ae','Grace Lim','+971 56 774 2290','grace.lim@gmail.com','referral','holiday',2200,'lost','staff.dubai@ezumrah.com','Chose another agency on price.'),
    lead('sa','Majed Al Suwaidi','+966 55 112 8830','majed.s@gmail.com','walk_in','holiday',1500,'new','staff.saudi@ezumrah.com','Taif weekend for couple.'),
    lead('sa','Salma Al Dabbous','+966 50 442 1199',None,'website','ziyarah',4500,'contacted','staff2.saudi@ezumrah.com','Madinah retreat for parents.'),
    lead('sa','Waleed Al Amer','+966 54 880 2214','waleed.amer@gmail.com','referral','umrah',2800,'qualified','owner.saudi@ezumrah.com','GCC resident package for visiting in-laws.'),
])
print('leads done')

# ============ 8. SALES (5 modules) ============
def sale_common(ag, cust_i, ref, status, pay_status, sale, cost, admin, paid, due=None, sold_by=None, follow=None, src='counter', tags='umrah'):
    if pay_status == 'paid': pay_status = 'full'
    return {'id': U(), 'agency_id': AG[ag], 'customer_id': C[ag][cust_i]['id'], 'ref': ref, 'status': status,
            'payment_status': pay_status, 'sale_total': sale, 'cost': cost, 'admin_fee': admin, 'amount_paid': paid,
            'balance': sale - paid, 'profit': sale - cost - (admin or 0), 'payment_method': random.choice(['cash','bank_transfer','card']),
            'due_date': due, 'sold_by': sold_by, 'source': src, 'tags': tags, 'follow_up_date': follow,
            'notes': None, 'created_at': 'now()', 'updated_at': 'now()'}

def flight(ag, i, ref, kind, pax, sale, cost, admin, paid, pay_status, status, pnr, airline_route, issue='2026-09-12', refundable='yes', due=None, follow=None):
    r = sale_common(ag, i, ref, status, pay_status, sale, cost, admin, paid, due, 'Ayesha Siddiqua' if ag=='pk' else None, follow)
    del r['cost']
    r.update({'trip_kind': kind, 'pax': pax, 'cost_total': cost, 'pnr': pnr, 'ticket_numbers': 'ETKT-' + str(random.randint(100000, 999999)),
              'supplier': airline_route[0], 'issue_date': issue, 'refundable': refundable, 'commission': 0, 'discount': 0,
              'tax': 0, 'fare_basis': 'YEEKS', 'notes': f'{airline_route[1]} — {pax} pax'})
    return r
ins('flight_sales', [
    flight('pk',0,'FS-PK-001','return',2,356000,308000,8000,356000,'paid','completed','3F9K2L',('Al-Musafir','KHI → JED Saudia SV702/703'),due='2026-09-10'),
    flight('pk',1,'FS-PK-002','oneway',1,172000,152000,0,100000,'partial','confirmed','7K2M9P',('Sky Tours','LHE → JED PIA PK792'),issue='2026-09-20',due='2026-10-10',follow='2026-10-07'),
    flight('pk',2,'FS-PK-003','return',4,690000,622000,12000,690000,'paid','completed','9D4L7R',('Al-Musafir','ISB → JED Airblue PA470/471'),issue='2026-08-28'),
    flight('pk',3,'FS-PK-004','oneway',2,340000,305000,0,0,'unpaid','pending','K1N8S4',('Fly Jeddah','KHI → MED Saudia SV288'),issue=None,due='2026-10-12',follow='2026-10-06'),
    flight('pk',4,'FS-PK-005','return',3,540000,471000,6000,270000,'partial','confirmed','R5T2Y8',('Al-Musafir','LHE → JED Saudia SV716/717'),issue='2026-09-25',due='2026-10-20'),
    flight('ae',0,'FS-AE-001','return',2,4600,3900,150,4600,'paid','completed','EKQ88F',('Emirates Direct','DXB → JED EK1861/1862')),
    flight('ae',1,'FS-AE-002','return',4,9200,8100,300,5000,'partial','confirmed','EYT44K',('Etihad Holidays','AUH → JED EY603/604'),issue='2026-09-18',due='2026-10-15'),
    flight('ae',2,'FS-AE-003','oneway',1,1150,980,0,1150,'paid','completed','G9P22M',('Air Arabia','SHJ → JED G9151')),
    flight('ae',3,'FS-AE-004','return',2,2300,2010,100,0,'unpaid','pending','FZL09X',('FlyDubai','DXB → JED FZ1721/1722'),issue=None,due='2026-10-09',follow='2026-10-05'),
    flight('sa',0,'FS-SA-001','return',3,1780,1430,80,1780,'paid','completed','SVK77B',('Saudia Direct','RUH → JED SV1420/1421')),
    flight('sa',2,'FS-SA-002','oneway',2,1240,1020,60,620,'partial','confirmed','SVN31C',('Saudia','DMM → JED SV1802'),issue='2026-09-22',due='2026-10-14'),
    flight('sa',1,'FS-SA-003','oneway',1,590,470,0,590,'paid','completed','SVJ55A',('Saudia','JED → RUH SV1445')),
])
print('flight_sales done')

def visa(ag, i, ref, vtype, sale, cost, paid, pay_status, status, proc_status, app_date, issued=None, expiry=None, center=None, nusuk_ref=None, nusuk_status=None, due=None):
    r = sale_common(ag, i, ref, status, pay_status, sale, cost, 0, paid, due)
    r['sale_price'] = r.pop('sale_total')
    r.update({'visa_type': vtype, 'pax': 1, 'application_date': app_date, 'issued_date': issued, 'expiry_date': expiry,
              'processing_center': center, 'processing_status': proc_status, 'insurance': 'included',
              'insurance_expiry': expiry, 'commission': 0, 'discount': 0, 'tax': 0, 'notes': None,
              'embassy_submission_date': app_date, 'nusuk_ref': nusuk_ref, 'nusuk_status': nusuk_status,
              'nusuk_submitted_at': None if not nusuk_ref else 'now()'})
    return r
ins('visa_sales', [
    visa('pk',0,'VS-PK-001','Umrah visa',48000,35000,48000,'paid','completed','issued','2026-09-05','2026-09-14','2026-12-14','Islamabad'),
    visa('pk',1,'VS-PK-002','Umrah visa',48000,35000,24000,'partial','confirmed','in_process','2026-09-22',center='Lahore',due='2026-10-12'),
    visa('pk',4,'VS-PK-003','Umrah visa',96000,70000,96000,'paid','completed','issued','2026-09-10','2026-09-20','2027-03-20','Karachi'),
    visa('pk',6,'VS-PK-004','Visit visa (KSA)',125000,98000,0,'unpaid','pending','documents','2026-09-30',center='Rawalpindi',due='2026-10-15'),
    visa('ae',0,'VS-AE-001','Nusuk Umrah e-visa',450,300,450,'paid','completed','issued','2026-09-06','2026-09-08','2027-03-08','Online via Nusuk','NUS-2026-88123','issued'),
    visa('ae',1,'VS-AE-002','Nusuk Umrah e-visa',1800,1200,900,'partial','confirmed','submitted','2026-09-24',nusuk_ref='NUS-2026-90417',nusuk_status='submitted',due='2026-10-11'),
    visa('ae',3,'VS-AE-003','Nusuk Umrah e-visa',450,300,450,'paid','completed','issued','2026-09-02','2026-09-05','2027-03-05','Online via Nusuk','NUS-2026-87002','issued'),
    visa('ae',5,'VS-AE-004','UAE re-entry permit',300,150,300,'paid','completed','issued','2026-09-15','2026-09-16','2027-03-16','Dubai'),
    visa('sa',4,'VS-SA-001','Family visit visa',950,700,950,'paid','completed','issued','2026-09-08','2026-09-19','2027-03-19','Jeddah'),
    visa('sa',6,'VS-SA-002','Umrah visa (expat)',300,180,300,'paid','completed','issued','2026-09-12','2026-09-13','2026-12-13','Jeddah','NUS-2026-91558','issued'),
    visa('sa',2,'VS-SA-003','Umrah visa (expat)',600,360,0,'unpaid','pending','documents','2026-09-28',center='Dammam',due='2026-10-13'),
])
print('visa_sales done')

def hotel(ag, i, ref, name, city, ci, nights, rooms, rtype, meal, sale, cost, paid, pay_status, status, conf=None, due=None):
    r = sale_common(ag, i, ref, status, pay_status, sale, cost, 0, paid, due)
    co = (datetime.date.fromisoformat(ci) + datetime.timedelta(days=nights)).isoformat()
    r['sale_price'] = r.pop('sale_total')
    r.update({'hotel_name': name, 'city': city, 'check_in': ci, 'check_out': co, 'nights': nights, 'rooms_count': rooms,
              'room_type': rtype, 'meal_plan': meal, 'confirmation_code': conf or 'BK' + str(random.randint(100000, 999999)),
              'adults': 2 * rooms, 'children': 0, 'supplier': 'Direct contract', 'rate_per_night': round(sale / nights / rooms),
              'guest_names': C[ag][i]['full_name'], 'commission': 0, 'discount': 0, 'tax': 0,
              'cancellation_policy': 'Free until 7 days before check-in', 'hotel_phone': '+966 12 000 0000'})
    return r
ins('hotel_sales', [
    hotel('pk',0,'HS-PK-001','Hilton Makkah Convention Palace','Makkah','2026-10-20',5,1,'Quad','Half board',420000,350000,420000,'paid','completed','HIL-88213'),
    hotel('pk',2,'HS-PK-002','Anwar Al Madinah Mövenpick','Madinah','2026-10-25',5,2,'Triple','Breakfast',380000,320000,190000,'partial','confirmed',due='2026-10-18'),
    hotel('pk',4,'HS-PK-003','Elaf Ajyad Hotel','Makkah','2026-11-05',7,1,'Quad','Room only',245000,205000,245000,'paid','completed','ELF-44190'),
    hotel('pk',6,'HS-PK-004','Makkah Towers','Makkah','2026-11-20',6,1,'Quad','Half board',288000,242000,0,'unpaid','pending',due='2026-10-25'),
    hotel('ae',0,'HS-AE-001','Swissotel Al Maqam Makkah','Makkah','2026-10-15',5,1,'Quad','Half board',7800,6400,7800,'paid','completed','SWI-77201'),
    hotel('ae',1,'HS-AE-002','Hilton Suites Makkah','Makkah','2026-11-10',4,1,'Family','Breakfast',9200,7600,4600,'partial','confirmed',due='2026-11-02'),
    hotel('ae',5,'HS-AE-003','InterContinental Dar Al Tawhid','Makkah','2026-10-28',3,1,'Double','Breakfast',5400,4500,5400,'paid','completed','ICT-31988'),
    hotel('ae',7,'HS-AE-004','Anwar Al Madinah Mövenpick','Madinah','2026-12-01',5,1,'Triple','Half board',6800,5600,0,'unpaid','pending',due='2026-11-20'),
    hotel('sa',0,'HS-SA-001','Fairmont Makkah Clock Royal Tower','Makkah','2026-10-12',3,2,'Double','Breakfast',4800,3900,4800,'paid','completed','FAI-90233'),
    hotel('sa',3,'HS-SA-002','Anwar Al Madinah Mövenpick','Madinah','2026-10-18',4,1,'Quad','Half board',3400,2800,1700,'partial','confirmed',due='2026-10-15'),
    hotel('sa',7,'HS-SA-003','Jeddah Hilton','Jeddah','2026-11-01',2,1,'Double','Room only',1400,1150,1400,'paid','completed','JED-55014'),
])
print('hotel_sales done')

def transport(ag, i, ref, ttype, frm, to, tdate, veh, pax, sale, cost, paid, pay_status, status, due=None, ret=None, flight_no=None):
    r = sale_common(ag, i, ref, status, pay_status, sale, cost, 0, paid, due)
    r['sale_price'] = r.pop('sale_total')
    r.update({'transport_type': ttype, 'from_location': frm, 'to_location': to, 'transport_date': tdate, 'return_date': ret,
              'vehicle_type': veh, 'seats': pax + 2, 'pax': pax, 'flight_no': flight_no,
              'driver_name': 'Abu Bakr' if ag != 'sa' else 'Saleh', 'driver_phone': '+966 55 000 0000',
              'meeting_point': 'Arrivals gate', 'luggage': pax, 'guide_name': None, 'commission': 0, 'discount': 0, 'tax': 0})
    return r
ins('transport_sales', [
    transport('pk',0,'TS-PK-001','airport_transfer','Jeddah Airport (JED)','Makkah hotel','2026-10-20','Toyota Hiace',6,38000,30000,38000,'paid','completed'),
    transport('pk',2,'TS-PK-002','intercity','Makkah hotel','Madinah hotel','2026-10-24','Coaster 30-seater',11,95000,78000,47500,'partial','confirmed',due='2026-10-22'),
    transport('pk',4,'TS-PK-003','airport_transfer','Madinah hotel','Madinah Airport (MED)','2026-11-01','Toyota Hiace',6,22000,17000,22000,'paid','completed'),
    transport('pk',6,'TS-PK-004','ziyarat','Makkah hotel','Ziyarat program','2026-11-22','GMC Suburban',6,45000,36000,0,'unpaid','pending',due='2026-10-30'),
    transport('ae',0,'TS-AE-001','airport_transfer','Jeddah Airport (JED)','Makkah hotel','2026-10-15','GMC Yukon XL',6,750,550,750,'paid','completed',flight_no='EK1861'),
    transport('ae',1,'TS-AE-002','intercity','Makkah hotel','Madinah hotel','2026-10-19','GMC Yukon XL',5,950,700,950,'paid','completed'),
    transport('ae',3,'TS-AE-003','airport_transfer','Jeddah Airport (JED)','Makkah hotel','2026-10-28','Toyota Hiace',10,1100,850,0,'unpaid','pending',due='2026-10-26',flight_no='FZ1721'),
    transport('sa',0,'TS-SA-001','airport_transfer','Jeddah Airport (JED)','Makkah hotel','2026-10-12','GMC Yukon XL',6,500,350,500,'paid','completed',flight_no='SV1420'),
    transport('sa',3,'TS-SA-002','ziyarat','Madinah hotel','Ziyarat program','2026-10-19','Toyota Hiace',8,450,300,450,'paid','completed'),
    transport('sa',6,'TS-SA-003','intercity','Taif resort','Jeddah home','2026-11-15','Toyota Camry',3,600,400,0,'unpaid','pending',due='2026-11-10',ret='2026-11-16'),
])
print('transport_sales done')

def psale(ag, i, ref, cat, pname, dep, days, pax, sale, cost, paid, pay_status, status, dep_flight, mk_hotel, mk_n, md_hotel, md_n, rooms_quad=1, supplement=0, due=None, ret_airline=None):
    r = sale_common(ag, i, ref, status, pay_status, sale, cost, 0, paid, due)
    ret_date = (datetime.date.fromisoformat(dep) + datetime.timedelta(days=days)).isoformat()
    r['sale_price'] = r.pop('sale_total')
    r.update({'package_category': cat, 'package_name': pname, 'departure_date': dep, 'return_date': ret_date, 'pax': pax,
              'airline': ret_airline or ('Saudia' if ag == 'pk' else 'Emirates' if ag == 'ae' else 'Saudia'),
              'flight_no': dep_flight, 'from_airport': {'pk': 'KHI', 'ae': 'DXB', 'sa': 'JED'}[ag], 'to_airport': 'JED',
              'depart_at': dep + 'T 02:30:00', 'return_flight_no': dep_flight.replace('1', '2') if dep_flight.endswith('1') else dep_flight + 'R',
              'pnr': 'PKG' + str(random.randint(100, 999)) + random.choice('KLMNPRST'),
              'makkah_hotel': mk_hotel, 'makkah_nights': mk_n, 'madinah_hotel': md_hotel, 'madinah_nights': md_n,
              'rooms_quint': 0, 'rooms_quad': rooms_quad, 'rooms_triple': 0, 'rooms_double': 0, 'rooms_single': 0,
              'supplement': supplement, 'commission': 0, 'discount': 0, 'tax': 0, 'ziyarat_scope': 'Included', 'ziyarat_guide': False,
              'ziyarat_notes': 'Standard ziyarat program both cities', 'notes': None})
    return r
ins('package_sales', [
    psale('pk',0,'PS-PK-001','umrah','14 Days Economy Umrah','2026-11-20',14,4,1540000,1290000,770000,'partial','confirmed','SV716','Makkah Towers',7,'Al Ebaa Hotel',5,1,due='2026-11-10'),
    psale('pk',1,'PS-PK-002','umrah','15 Days Premium Umrah','2026-10-25',15,2,1500000,1270000,1500000,'paid','completed','SV702','Hilton Convention Palace',8,'Anwar Al Madinah Mövenpick',6,1),
    psale('pk',3,'PS-PK-003','umrah','Ramzan 2027 · 20 Days','2027-03-05',20,2,1850000,1560000,500000,'partial','pending','SV720','Aziziyah Mubarak',12,'Retaj Al Madinah',7,1,supplement=0,due='2027-01-30'),
    psale('pk',5,'PS-PK-004','ziyarah','Ziyarat & City Tour','2026-10-10',3,2,70000,55000,70000,'paid','completed','PK792','-',0,'-',0,0),
    psale('ae',0,'PS-AE-001','umrah','14 Days Family Umrah','2026-10-15',14,5,39500,31800,39500,'paid','confirmed','EK1861','Swissotel Al Maqam',7,'Hilton Madinah',6,2),
    psale('ae',3,'PS-AE-002','umrah','10 Days Umrah Express','2026-11-08',10,2,9700,7900,4850,'partial','confirmed','FZ1721','Elaf Ajyad',5,'Taibah Front',4,1,due='2026-10-31'),
    psale('ae',4,'PS-AE-003','hajj','Hajj 2027 Premium','2027-05-20',21,2,69000,56000,35000,'partial','pending','EK1863','Mina VIP Tent',4,'-',0,1,supplement=5000,due='2027-03-15'),
    psale('ae',7,'PS-AE-004','tour','Jeddah City & Ziyarat','2026-12-01',4,4,5800,4600,0,'unpaid','pending','FZ1723','-',0,'-',0,0,due='2026-11-20'),
    psale('sa',5,'PS-SA-001','umrah','Umrah for GCC Residents','2026-11-05',7,4,10400,8500,5200,'partial','confirmed','SV1408','Makkah Clock Tower',4,'Movenpick Anwar',2,1,due='2026-10-30'),
    psale('sa',0,'PS-SA-002','ziyarah','Madinah Spiritual Retreat','2026-10-18',5,2,8400,6900,8400,'paid','completed','SV1445','-',0,'Fairmont Madinah',5,1),
    psale('sa',6,'PS-SA-003','tour','Taif Summer Escape','2026-11-15',2,2,1900,1500,1900,'paid','completed','SV1616','-',0,'-',0,0),
])
print('package_sales done')

# ============ 9. BOOKINGS / INVOICES / PAYMENTS / QUOTATIONS ============
def booking(ag, i, ref, pname, dep, days, pilgrims, total, paid, status, src='website'):
    return {'id': U(), 'booking_ref': ref, 'customer_id': C[ag][i]['id'], 'package_name': pname,
            'trip_type': 'umrah', 'status': status, 'pilgrims_count': pilgrims, 'departure_date': dep,
            'return_date': (datetime.date.fromisoformat(dep) + datetime.timedelta(days=days)).isoformat(),
            'total_amount': total, 'paid_amount': paid, 'currency': CUR[ag], 'source': src,
            'notes': None, 'agency_id': AG[ag], 'created_at': 'now()', 'updated_at': 'now()'}
BKS = [
    booking('pk',0,'BK-PK-001','14 Days Economy Umrah','2026-11-20',14,4,1540000,770000,'confirmed','walk_in'),
    booking('pk',1,'BK-PK-002','15 Days Premium Umrah','2026-10-25',15,2,1500000,1500000,'confirmed'),
    booking('pk',3,'BK-PK-003','Ramzan 2027 · 20 Days','2027-03-05',20,2,1850000,500000,'pending','whatsapp'),
    booking('ae',0,'BK-AE-001','14 Days Family Umrah','2026-10-15',14,5,39500,39500,'confirmed'),
    booking('ae',3,'BK-AE-002','10 Days Umrah Express','2026-11-08',10,2,9700,4850,'confirmed','instagram'),
    booking('sa',5,'BK-SA-001','Umrah for GCC Residents','2026-11-05',7,4,10400,5200,'confirmed','referral'),
    booking('sa',0,'BK-SA-002','Madinah Spiritual Retreat','2026-10-18',5,2,8400,8400,'confirmed'),
]
ins('bookings', BKS)

TAXR = {'pk': 0, 'ae': 0.05, 'sa': 0.15}
def invoice(ag, no, bk_i, cust_i, desc_lines, status, issue, due, method='bank_transfer'):
    sub = sum(a for _, _, a in desc_lines)
    tax = round(sub * TAXR[ag])
    inv = {'id': U(), 'invoice_no': no, 'booking_id': BKS[bk_i]['id'] if bk_i is not None else None,
           'customer_id': C[ag][cust_i]['id'], 'issue_date': issue, 'due_date': due, 'status': status,
           'subtotal': sub, 'tax_amount': tax, 'total': sub + tax, 'currency': CUR[ag],
           'notes': 'Thank you for your business.', 'agency_id': AG[ag], 'created_at': 'now()', 'updated_at': 'now()'}
    return inv, [{'id': U(), 'invoice_id': inv['id'], 'description': d, 'quantity': qty, 'unit_price': up,
                  'amount': a, 'agency_id': AG[ag], 'created_at': 'now()'} for d, qty, up, a in
                  [(d, q, a // q if q else a, a) for d, q, a in desc_lines]]
INVS, ITEMS, PAYS = [], [], []
def add_inv(ag, no, bk_i, cust_i, lines, status, issue, due, paid_amount=None, method='bank_transfer'):
    inv, items = invoice(ag, no, bk_i, cust_i, lines, status, issue, due, method)
    INVS.append(inv); ITEMS.extend(items)
    if paid_amount:
        PAYS.append({'id': U(), 'agency_id': AG[ag], 'invoice_id': inv['id'], 'booking_id': None,
                     'amount': paid_amount, 'payment_date': issue, 'method': method.replace('bank_transfer','bank'),
                     'reference': 'TRX-' + str(random.randint(100000, 999999)), 'notes': None, 'created_at': 'now()', 'updated_at': 'now()'})
add_inv('pk','INV-PK-2026-001',0,0,[('14 Days Economy Umrah — 4 pax',1,1540000),('Travel insurance',1,6000)],'paid','2026-09-28','2026-10-05',1546000)
add_inv('pk','INV-PK-2026-002',1,1,[('15 Days Premium Umrah — 2 pax',1,1500000)],'paid','2026-09-20','2026-09-25',1500000)
add_inv('pk','INV-PK-2026-003',2,3,[('Ramzan 2027 package deposit',1,500000)],'partial','2026-09-30','2026-11-30',500000)
add_inv('ae','INV-AE-2026-001',3,0,[('14 Days Family Umrah — 5 pax',1,39500),('Ziyarat supplement',1,300)],'paid','2026-09-18','2026-09-25',39800)
add_inv('ae','INV-AE-2026-002',4,3,[('10 Days Umrah Express — 2 pax',1,9700)],'partial','2026-09-26','2026-10-20',4850)
add_inv('sa','INV-SA-2026-001',5,5,[('Umrah for GCC Residents — 4 pax',1,10400)],'partial','2026-09-24','2026-10-15',5200)
add_inv('sa','INV-SA-2026-002',6,0,[('Madinah Spiritual Retreat — 2 pax',1,8400),('Airport transfers',2,300)],'paid','2026-09-16','2026-09-22',9000)
ins('invoices', INVS); ins('invoice_items', ITEMS); ins('payments', PAYS)
print('invoices/payments done')

def quote(ag, no, cust_i, title, lines, status, valid, terms='Prices include all taxes and service charges. 30% deposit confirms the booking.'):
    sub = sum(a for _, _, a in lines)
    tax = round(sub * TAXR[ag])
    qt = {'id': U(), 'quote_no': no, 'customer_id': C[ag][cust_i]['id'], 'booking_id': None, 'valid_until': valid,
          'status': status, 'subtotal': sub, 'tax_amount': tax, 'total': sub + tax, 'currency': CUR[ag],
          'notes': None, 'agency_id': AG[ag], 'title': title, 'terms': terms, 'discount': 0,
          'created_at': 'now()', 'updated_at': 'now()'}
    return qt, [{'id': U(), 'quotation_id': qt['id'], 'description': d, 'quantity': q, 'unit_price': a // q if q else a,
                 'amount': a, 'agency_id': AG[ag], 'created_at': 'now()'} for d, q, a in lines]
QTS, QIS = [], []
def add_qt(ag, no, cust_i, title, lines, status, valid):
    qt, items = quote(ag, no, cust_i, title, lines, status, valid)
    QTS.append(qt); QIS.extend(items)
add_qt('pk','QT-PK-2026-001',3,'Ramzan 2027 · 20 Days Umrah',[('Ramzan package — 2 pax',1,1850000),('Iftar supplement',1,40000)],'sent','2026-10-31')
add_qt('pk','QT-PK-2026-002',4,'15 Days Premium Umrah — December',[('Premium package — 3 pax',1,2250000)],'draft','2026-11-15')
add_qt('ae','QT-AE-2026-001',2,'Hajj 2027 Premium — VIP tent',[('Hajj VIP package — 2 pax',1,69000),('Muftawiyah services',1,2000)],'sent','2026-11-30')
add_qt('ae','QT-AE-2026-002',6,'10 Days Umrah Express — family',[('Express package — 4 pax',1,19400)],'accepted','2026-10-15')
add_qt('sa','QT-SA-2026-001',2,'Jeddah Corniche Holiday',[('Resort weekend — 2 pax',1,1800),('Airport transfers',2,200)],'accepted','2026-10-10')
add_qt('sa','QT-SA-2026-002',4,'Madinah Spiritual Retreat — group',[('Retreat package — 6 pax',1,25200)],'sent','2026-10-31')
ins('quotations', QTS); ins('quotation_items', QIS)
print('quotations done')

# ============ 10. TASKS ============
def task(ag, title, due, priority, status, assignee, desc=None):
    return {'id': U(), 'title': title, 'description': desc, 'related_booking_id': None, 'due_date': due,
            'priority': priority, 'status': status, 'assigned_to': U_[assignee], 'agency_id': AG[ag],
            'created_at': 'now()', 'updated_at': 'now()'}
ins('tasks', [
    task('pk','Collect balance from Rukhsana Bibi (FS-PK-002)','2026-10-07','high','in_progress','staff.pak@ezumrah.com','72,000 PKR remaining on PIA tickets'),
    task('pk','Submit Farhat Naseem visa documents','2026-10-06','urgent','todo','staff.pak@ezumrah.com','Passport copies pending from customer'),
    task('pk','Send Ramzan 2027 offer to Nasreen Akhtar','2026-10-09','medium','todo','owner.pak@ezumrah.com','Use QT-PK-2026-001 pricing'),
    task('pk','Confirm November airline group allotment','2026-09-30','medium','done','owner.pak@ezumrah.com','30 seats blocked on SV716'),
    task('ae','Chase Nusuk visa for Aisha Verghese family','2026-10-05','urgent','in_progress','manager.dubai@ezumrah.com','NUS-2026-90417 submitted, follow up daily'),
    task('ae','Prepare Hajj 2027 VIP proposal for Hussein Nasser','2026-10-12','high','todo','owner.dubai@ezumrah.com'),
    task('ae','Send November hotel options to Maria Santos','2026-10-08','medium','todo','staff.dubai@ezumrah.com'),
    task('ae','Reconcile September payroll','2026-10-02','low','done','owner.dubai@ezumrah.com'),
    task('sa','Collect balance from Hessa Al Mutairi (PS-SA-001)','2026-10-30','high','in_progress','staff.saudi@ezumrah.com','5,200 SAR remaining'),
    task('sa','Arrange Taif resort vehicle for Bandar Al Otaibi','2026-11-13','medium','todo','staff2.saudi@ezumrah.com'),
    task('sa','Follow up expat visa documents (VS-SA-003)','2026-10-10','urgent','todo','staff.saudi@ezumrah.com','Dammam center appointment needed'),
    task('sa','Publish Taif weekend package to showcase','2026-09-28','low','done','owner.saudi@ezumrah.com'),
])
print('tasks done')

# ============ 11. DOCUMENTS ============
def doc(ag, cust_i, title, dtype, fname, expiry=None):
    return {'id': U(), 'booking_id': None, 'customer_id': C[ag][cust_i]['id'], 'title': title, 'doc_type': dtype,
            'file_url': f'/documents/{AG[ag][:8]}/{fname}', 'file_name': fname, 'file_size': random.randint(200000, 1800000),
            'expiry_date': expiry, 'notes': None, 'agency_id': AG[ag], 'created_at': 'now()', 'updated_at': 'now()'}
ins('documents', [
    doc('pk',0,'Passport scan — Asif Khan','passport','asif-khan-passport.pdf'),
    doc('pk',0,'Umrah visa copy','visa','asif-khan-visa.pdf','2026-12-14'),
    doc('pk',1,'Passport scan — Rukhsana Bibi','passport','rukhsana-passport.pdf','2030-06-15'),
    doc('ae',0,'Passport scan — Imran Baig','passport','imran-baig-passport.pdf'),
    doc('ae',0,'Nusuk e-visa','visa','imran-baig-nusuk.pdf','2027-03-08'),
    doc('ae',1,'Passport scans — Verghese family','passport','verghese-family-passports.pdf'),
    doc('sa',0,'National ID — Salman Al Dosari','other','salman-muqeem.pdf','2032-01-01'),
    doc('sa',5,'Family visit visa','visa','mutairi-visit-visa.pdf','2027-03-19'),
])
print('documents done')

# ============ 12. HR (PROFESSIONAL PLAN: AE + SA) ============
def employee(ag, name, desig, dept, salary, join, email, phone, status='active'):
    return {'id': U(), 'agency_id': AG[ag], 'full_name': name, 'email': email, 'phone': phone,
            'designation': desig, 'department': dept, 'join_date': join, 'monthly_salary': salary,
            'status': status, 'notes': None, 'created_at': 'now()', 'updated_at': 'now()',
            'bank_name': 'Emirates NBD' if ag == 'ae' else 'Al Rajhi Bank', 'account_title': name}
EMP = [
    employee('ae','Bilal Akram','Senior Travel Consultant','Sales',9500,'2023-03-01','bilal.akram@emiratesziyarah.ae','+971 50 112 3344'),
    employee('ae','Noor El Sayed','Visa Processing Officer','Operations',6800,'2024-06-15','noor.elsayed@emiratesziyarah.ae','+971 55 220 1188'),
    employee('ae','Hind Al Marri','Accountant','Finance',8200,'2022-11-01','hind.almarri@emiratesziyarah.ae','+971 52 447 9900'),
    employee('ae','Joseph Cruz','Airport Coordinator','Operations',5200,'2025-01-10','joseph.cruz@emiratesziyarah.ae','+971 56 118 2244'),
    employee('sa','Amjad Al Zahrani','Operations Supervisor','Operations',9000,'2023-05-20','amjad.z@haramaintravel.sa','+966 55 220 1188'),
    employee('sa','Nasser Al Ghamdi','Senior Driver','Transport',4500,'2022-08-01','nasser.g@haramaintravel.sa','+966 50 442 7711'),
    employee('sa','Huda Al Otaibi','Customer Service Agent','Support',6500,'2024-09-05','huda.o@haramaintravel.sa','+966 53 991 2200'),
]
ins('employees', EMP)
def payroll(ag, e_i, basic, allowances, deductions, status='paid'):
    net = basic + allowances - deductions
    return {'id': U(), 'agency_id': AG[ag], 'employee_id': EMP[e_i]['id'], 'pay_month': '2026-09',
            'basic': basic, 'allowances': allowances, 'deductions': deductions, 'net': net, 'status': status,
            'paid_on': '2026-09-28' if status == 'paid' else None, 'notes': None, 'created_at': 'now()', 'updated_at': 'now()'}
ins('payroll', [
    payroll('ae',0,9500,1500,475), payroll('ae',1,6800,1200,340), payroll('ae',2,8200,1000,410), payroll('ae',3,5200,900,260),
    payroll('sa',4,9000,1400,0), payroll('sa',5,4500,700,0), payroll('sa',6,6500,900,0,'draft'),
])
def leave(ag, e_i, ltype, frm, days, status, reason):
    return {'id': U(), 'agency_id': AG[ag], 'employee_id': EMP[e_i]['id'], 'leave_type': ltype,
            'leave_from': frm, 'leave_to': (datetime.date.fromisoformat(frm) + datetime.timedelta(days=days-1)).isoformat(),
            'days': days, 'reason': reason, 'status': status, 'created_at': 'now()', 'updated_at': 'now()'}
ins('leaves', [
    leave('ae',0,'annual','2026-10-14',5,'approved','Family umrah trip'),
    leave('ae',3,'sick','2026-09-22',2,'approved','Flu'),
    leave('ae',1,'annual','2026-11-09',7,'pending','Home visit to Egypt'),
    leave('sa',5,'annual','2026-11-01',10,'pending','Wedding in family'),
    leave('sa',6,'sick','2026-09-30',1,'approved','Medical appointment'),
])
def attrow(ag, e_i, dt, status='present'):
    return {'id': U(), 'agency_id': AG[ag], 'employee_id': EMP[e_i]['id'], 'att_date': dt,
            'check_in': '09:02', 'check_out': '18:05', 'status': status, 'notes': None, 'created_at': 'now()', 'updated_at': 'now()'}
ATT = []
for d in ['2026-09-28','2026-09-29','2026-09-30','2026-10-01','2026-10-02']:
    for ag, idxs in (('ae', [0,1,2,3]), ('sa', [4,5,6])):
        for i in idxs:
            st = 'absent' if (d == '2026-10-01' and i == 5 and ag == 'sa') else ('half_day' if d == '2026-09-29' and i == 1 else 'present')
            ATT.append(attrow(ag, i, d, st))
ins('attendance', ATT)
print('HR done')

# ============ 13. EXPENSES (ACCOUNTS — professional tier) ============
def exp(ag, cat, desc, amount, dt, method='bank'):
    return {'id': U(), 'agency_id': AG[ag], 'category': cat, 'description': desc, 'amount': amount,
            'expense_date': dt, 'payment_method': method, 'reference': 'EXP-' + str(random.randint(1000, 9999)),
            'created_at': 'now()', 'updated_at': 'now()'}
ins('expenses', [
    exp('ae','rent','October office rent — Al Maktoum Tower',16000,'2026-10-01'),
    exp('ae','marketing','Meta ads — Umrah winter campaign',4500,'2026-09-15'),
    exp('ae','visa_fees','Nusuk visa bulk purchase',3200,'2026-09-20','card'),
    exp('ae','office','DEWA + internet',1850,'2026-09-28'),
    exp('sa','rent','October showroom rent — Andalus St',12500,'2026-10-01'),
    exp('sa','travel','Fleet fuel — September',2850,'2026-09-30','cash'),
    exp('sa','office','GMC Yukon service — 2 vehicles',1400,'2026-09-18','card'),
    exp('sa','marketing','Google Ads — GCC residents campaign',3000,'2026-09-10'),
])
print('expenses done')

# ============ 14. CHAT (PROFESSIONAL TIER: AE + SA) ============
def convo(ag, a, b, msgs):
    cid = U()
    ins('chat_conversations', [{'id': cid, 'agency_id': AG[ag], 'kind': 'direct', 'a_id': U_[a], 'b_id': U_[b], 'created_at': 'now()'}])
    rows, t = [], 0
    for who, body in msgs:
        t += 37
        rows.append({'id': U(), 'agency_id': AG[ag], 'profile_id': U_[who], 'conversation_id': cid, 'body': body,
                     'created_at': f"RAW:now() - interval '{len(msgs)-len(rows)} minutes'", 'deleted_at': None})
    ins('chat_messages', rows)
    return cid
convo('ae','owner.dubai@ezumrah.com','manager.dubai@ezumrah.com',[
    ('owner.dubai@ezumrah.com','Salam Sara, any update on the Nusuk visa for the Verghese family?'),
    ('manager.dubai@ezumrah.com','Wa alaikum salam. Submitted yesterday, NUS-2026-90417. Nusuk says 48-72 hours.'),
    ('owner.dubai@ezumrah.com','Good. Let me know the moment it issues so we can invoice the balance.'),
    ('manager.dubai@ezumrah.com','Will do. Also the November allotment is nearly full — should I block 10 more seats on FZ1721?'),
    ('owner.dubai@ezumrah.com','Yes, take 10. Send me the cost sheet after.'),
])
convo('ae','manager.dubai@ezumrah.com','staff.dubai@ezumrah.com',[
    ('manager.dubai@ezumrah.com','Rahul, please chase Maria Santos for the November hotel options I sent.'),
    ('staff.dubai@ezumrah.com','On it — she asked for half board instead of room only. Revising the quote.'),
])
convo('sa','owner.saudi@ezumrah.com','staff.saudi@ezumrah.com',[
    ('owner.saudi@ezumrah.com','Yousef, what is the balance status on the Al Mutairi GCC package?'),
    ('staff.saudi@ezumrah.com','5,200 SAR remaining, due 30 Oct. She confirmed transfer this week.'),
    ('owner.saudi@ezumrah.com','Perfect. Once received, mark the invoice paid and send the e-tickets.'),
])
convo('sa','owner.saudi@ezumrah.com','staff2.saudi@ezumrah.com',[
    ('staff2.saudi@ezumrah.com','The Taif weekend package is live on the showcase page.'),
    ('owner.saudi@ezumrah.com','Shukran! Share the link on the WhatsApp groups too.'),
])
print('chat done')

# ============ 15. CUSTOM FIELD DEFS ============
ins('custom_field_defs', [
    {'id': U(), 'agency_id': AG['pk'], 'module': 'flight_sales', 'label': 'Refund amount', 'field_type': 'minus',
     'position': 0, 'active': True, 'section': 'money', 'anchor': 'inline', 'created_at': 'now()'},
    {'id': U(), 'agency_id': AG['ae'], 'module': 'visa_sales', 'label': 'Nusuk tracking ID', 'field_type': 'text',
     'position': 0, 'active': True, 'section': 'customer', 'anchor': 'inline', 'created_at': 'now()'},
    {'id': U(), 'agency_id': AG['sa'], 'module': 'hotel_sales', 'label': 'Tower preference', 'field_type': 'text',
     'position': 0, 'active': True, 'section': 'customer', 'anchor': 'inline', 'created_at': 'now()'},
])
print('custom fields done')

# ============ VERIFY ============
for t in ('agencies','profiles','customers','packages','leads','flight_sales','visa_sales','hotel_sales','transport_sales','package_sales','bookings','invoices','invoice_items','payments','quotations','quotation_items','tasks','documents','employees','payroll','leaves','attendance','expenses','chat_conversations','chat_messages','custom_field_defs'):
    n = q(f"select count(*) c from {t};")[0]['c']
    print(f"{t}: {n}")
print('SEED COMPLETE')
