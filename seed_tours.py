"""Tour module demo data: packages, itineraries, departures, vehicles, hotels, pickups, seat blocks, bookings, passengers.

Usage:
  - standalone:  python3 seed_tours.py   (resolves agency ids from live DB, wipes only tour tables first)
  - from seed.py: import seed_tours; seed_tours.run(AG, q, ins, U)
"""
import json, os, sys, urllib.request, uuid

TOKEN = os.environ['SUPABASE_ACCESS_TOKEN']
API = 'https://api.supabase.com/v1/projects/atirgzxlmxwqjhzqfyfa/database/query'


def _q(sql):
    d = json.dumps({"query": sql}).encode()
    r = urllib.request.Request(API, data=d, headers={'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json'})
    try:
        return json.loads(urllib.request.urlopen(r).read().decode())
    except urllib.error.HTTPError as e:
        raise Exception(f'SQL failed ({e.code}): {e.read().decode()[:300]}\nSQL: {sql[:200]}')


def _esc(v):
    if v is None: return 'NULL'
    if isinstance(v, str) and v.startswith('RAW:'): return v[4:]
    if isinstance(v, bool): return 'true' if v else 'false'
    return "'" + str(v).replace("'", "''") + "'"


def _ins(table, rows):
    if not rows: return
    cols = list(rows[0].keys())
    for r in rows: assert set(r.keys()) == set(cols), (table, sorted(set(r) ^ set(cols)))
    body = ',\n'.join('(' + ', '.join(_esc(r[c]) for c in cols) + ')' for r in rows)
    _q(f"INSERT INTO {table} ({', '.join(cols)}) VALUES\n{body};")


TOUR_TABLES = ['tour_passengers', 'tour_bookings', 'tour_seat_blocks', 'tour_departure_pickups',
               'tour_departure_hotels', 'tour_departure_vehicles', 'tour_departures', 'tour_itinerary', 'tour_packages']


def run(AG, q=None, ins=None, U=None):
    q = q or _q
    ins = ins or _ins
    U = U or (lambda: str(uuid.uuid4()))

    ids = {}   # per agency: {'pkg_id':..., 'dep_id':..., 'veh_id':..., 'pick_id':..., 'bk_id':...}
    pkg_rows, itin_rows, dep_rows, veh_rows, hot_rows, pick_rows, blk_rows, bk_rows, pax_rows = [], [], [], [], [], [], [], [], []

    def pkg(ag, name, ttype, days, price, incl, excl, ziy, desc, itin, deps):
        pid = U(); ids[(ag, 'pkg')] = pid
        pkg_rows.append({'id': pid, 'agency_id': AG[ag], 'name': name, 'tour_type': ttype, 'days': days,
                         'base_price': price, 'inclusions': incl, 'exclusions': excl, 'ziyarat': ziy,
                         'description': desc, 'created_at': 'now()'})
        for dno, kind, title, loc, st, notes in itin:
            itin_rows.append({'id': U(), 'agency_id': AG[ag], 'package_id': pid, 'kind': kind, 'day_no': dno,
                              'title': title, 'location': loc, 'start_time': st, 'notes': notes, 'created_at': 'now()'})
        for d in deps:
            d(pid)

    def dep(ag, date, ret, status, notes=''):
        did = U(); ids[(ag, 'dep')] = did
        dep_rows.append({'id': did, 'agency_id': AG[ag], 'package_id': ids[(ag, 'pkg')], 'departure_date': date,
                         'return_date': ret, 'status': status, 'notes': notes, 'created_at': 'now()'})
        return did

    def veh(ag, did, vtype, label, plate, seats):
        vid = U(); ids[(ag, 'veh')] = vid
        veh_rows.append({'id': vid, 'agency_id': AG[ag], 'departure_id': did, 'vehicle_type': vtype,
                         'vehicle_label': label, 'plate_no': plate, 'total_seats': seats, 'created_at': 'now()'})
        return vid

    def hotel(ag, did, city, name, ci, co, s=0, d_=0, t=0, q_=0, o=0):
        hot_rows.append({'id': U(), 'agency_id': AG[ag], 'departure_id': did, 'city': city, 'hotel_name': name,
                         'check_in': ci, 'check_out': co, 'single_rooms': s, 'double_rooms': d_, 'triple_rooms': t,
                         'quad_rooms': q_, 'other_rooms': o, 'created_at': 'now()'})

    def pickup(ag, did, loc, time_, notes=''):
        pid_ = U(); ids[(ag, 'pick')] = pid_
        pick_rows.append({'id': pid_, 'agency_id': AG[ag], 'departure_id': did, 'location': loc,
                          'pickup_time': time_, 'notes': notes, 'created_at': 'now()'})
        return pid_

    def block(ag, did, vid, seat, kind, reason):
        blk_rows.append({'id': U(), 'agency_id': AG[ag], 'departure_id': did, 'vehicle_id': vid,
                         'seat_no': seat, 'kind': kind, 'reason': reason, 'created_at': 'now()'})

    def booking(ag, did, ref, group, contact, phone, price, cost, paid, method, pstatus, status, notes, pax):
        bid = U()
        due = 'RAW:current_date + 14'
        bk_rows.append({'id': bid, 'agency_id': AG[ag], 'departure_id': did, 'ref': ref, 'group_name': group,
                        'contact_name': contact, 'contact_phone': phone, 'sale_price': price, 'cost': cost,
                        'amount_paid': paid, 'payment_method': method, 'payment_status': pstatus,
                        'balance': price - paid, 'due_date': due, 'notes': notes, 'status': status, 'created_at': 'now()'})
        for nm, gender, age, pport, room_type, hotel_room, seat_no, checkin in pax:
            pax_rows.append({'id': U(), 'agency_id': AG[ag], 'booking_id': bid, 'full_name': nm, 'gender': gender,
                             'age': age, 'passport_no': pport, 'phone': None, 'room_group': None,
                             'room_preference': room_type, 'room_type': room_type, 'hotel_room': hotel_room,
                             'bed_label': None, 'seat_vehicle_id': ids[(ag, 'veh')] if seat_no else None,
                             'seat_no': seat_no, 'pickup_id': ids[(ag, 'pick')], 'checkin_status': checkin,
                             'notes': None, 'created_at': 'now()'})

    # ================= AL-NOOR (PK) =================
    def pk_dep1(pid):
        did = dep('pk', '2026-11-12', '2026-11-20', 'confirmed', 'Guaranteed departure — 16 seats booked')
        veh('pk', did, 'Coaster', 'Coach A — Cappadocia circuit', 'LEB-4471', 20)
        hotel('pk', did, 'Istanbul', 'Grand Haliç Hotel', '2026-11-12', '2026-11-16', 0, 5, 2, 0, 0)
        hotel('pk', did, 'Cappadocia', 'Sultan Cave Suites', '2026-11-16', '2026-11-20', 0, 3, 0, 1, 0)
        pickup('pk', did, 'Islamabad Intl Airport — Terminal 3', '03:30', 'Report 3 hrs before TK-715')
        pickup('pk', did, 'Istanbul Airport — arrivals gate', '10:45', 'Meet & greet with Turkish guide')
        block('pk', did, ids[('pk', 'veh')], 1, 'blocked', 'Driver seat')
        block('pk', did, ids[('pk', 'veh')], 2, 'reserved', 'Tour guide')
        booking('pk', did, 'TB-PK-001', 'Khan family & friends', 'Muhammad Asif Khan', '+92 300 555 1188',
                420000, 350000, 420000, 'bank', 'full', 'confirmed',
                '6 pax — twin + one triple', [
                    ('Muhammad Asif Khan', 'male', 44, 'PB1928374', 'double', 'IST-201', 3, 'checked_in'),
                    ('Rubina Asif', 'female', 41, 'PB1928401', 'double', 'IST-201', 4, 'checked_in'),
                    ('Ahmed Raza', 'male', 26, 'PB1928418', 'triple', 'IST-305', 5, 'checked_in'),
                    ('Fatima Raza', 'female', 24, 'PB1928425', 'triple', 'IST-305', 6, 'checked_in'),
                ])
        booking('pk', did, 'TB-PK-002', 'Naveed group', 'Chaudhry Naveed Ahmed', '+92 321 555 2233',
                380000, 320000, 190000, 'cash', 'partial', 'confirmed',
                '4 pax — 2 doubles', [
                    ('Chaudhry Naveed Ahmed', 'male', 52, 'PA7261539', 'double', 'CAP-102', 7, None),
                    ('Bilqees Naveed', 'female', 49, 'PA7261546', 'double', 'CAP-102', 8, None),
                    ('Ahmed Naveed', 'male', 21, 'PA7261553', 'double', 'CAP-104', 9, None),
                    ('Fatima Naveed', 'female', 19, 'PA7261560', 'double', 'CAP-104', 10, None),
                ])

    def pk_dep2(pid):
        did = dep('pk', '2026-12-05', '2026-12-09', 'pending', 'Needs 8 more pax to guarantee')
        veh('pk', did, 'Hiace', 'Van 1 — city transfers', 'KHI-9910', 12)
        hotel('pk', did, 'Dubai', 'Avani Deira Hotel', '2026-12-05', '2026-12-09', 0, 4, 0, 0, 0)
        pickup('pk', did, 'Dubai Intl Airport — Gate 4', '22:15', 'Late-night arrival, driver on WhatsApp')
        booking('pk', did, 'TB-PK-003', 'Malik family', 'Malik Sohail Akhtar', '+92 333 555 7744',
                285000, 232000, 100000, 'card', 'partial', 'confirmed',
                'Family of 4 — 2 doubles', [
                    ('Malik Sohail Akhtar', 'male', 39, 'PC5541029', 'double', 'DXB-501', 1, None),
                    ('Ayesha Sohail', 'female', 36, 'PC5541036', 'double', 'DXB-501', 2, None),
                ])

    pkg('pk', 'Turkey 7 Nights — Istanbul & Cappadocia', 'custom', 8, 105000,
        'Return airfare ex-Islamabad, 4★ hotels, all transfers, Turkish guide, 2 ziyarat tours, daily breakfast',
        'Turkey e-visa, travel insurance, lunches & dinners, hot air balloon ride (bookable separately)',
        'Eyup Sultan Mosque, Sahaba resting places in Istanbul',
        'Istanbul old city, Bosphorus cruise, Cappadocia cave hotels and valleys — the classic Turkish circuit.',
        [
            (1, 'visit', 'Arrive Istanbul — airport welcome', 'Istanbul', '10:45', 'Private transfer to Haliç, evening free'),
            (2, 'ziyarat', 'Eyup Sultan Mosque & old city ziyarat', 'Istanbul', '09:00', 'Dress code: modest, headscarf for ladies'),
            (3, 'visit', 'Bosphorus cruise & spice bazaar', 'Istanbul', '10:00', 'Boat departs Eminönü pier'),
            (4, 'visit', 'Fly to Cappadocia — cave hotel check-in', 'Cappadocia', '08:00', 'Internal flight TK2010'),
            (5, 'visit', 'Red Valley & Göreme open-air museum', 'Cappadocia', '09:30', 'Sunset point photos'),
            (6, 'visit', 'Underground city & pottery workshop', 'Cappadocia', '09:00', 'Derinkuyu entry included'),
            (7, 'visit', 'Fly back to Istanbul — free day', 'Istanbul', '11:00', 'Last-minute shopping at Grand Bazaar'),
            (8, 'visit', 'Departure — TK-716 to Islamabad', 'Istanbul', '07:30', 'Airport transfer 3 hrs before flight'),
        ], [pk_dep1])

    pkg('pk', 'Dubai City Break 4 Nights', 'custom', 5, 71250,
        'Return airfare ex-Karachi, 3★ Deira hotel, Desert safari, Dubai Mall & Miracle Garden transfers, breakfast',
        'UAE visa fee, Burj Khalifa ticket (At the Top), meals',
        None,
        'Long-weekend Dubai: Burj Khalifa, desert safari dune dinner, Miracle Garden and Dubai Mall shopping.',
        [
            (1, 'visit', 'Arrive Dubai — check in Deira', 'Dubai', '22:15', 'Late check-in arranged'),
            (2, 'visit', 'City tour — Burj Khalifa & Dubai Mall', 'Dubai', '10:00', 'Optional At the Top ticket'),
            (3, 'visit', 'Desert safari + dune dinner', 'Dubai Desert', '15:00', 'Pickup from hotel lobby'),
            (4, 'visit', 'Miracle Garden & Global Village', 'Dubailand', '10:30', 'Seasonal opening check'),
            (5, 'visit', 'Departure — EK-606 to Karachi', 'Dubai', '02:30', 'Airport transfer at 23:30'),
        ], [pk_dep2])

    # ================= EMIRATES ZIYARAH (AE) =================
    def ae_dep1(pid):
        did = dep('ae', '2026-10-24', '2026-10-30', 'confirmed', 'Cairo & Alexandria circuit — guide confirmed')
        veh('ae', did, 'Mercedes Sprinter', 'Van 1 — Cairo city runs', 'DXB-A118', 18)
        hotel('ae', did, 'Cairo', 'Barceló Pyramids Hotel', '2026-10-24', '2026-10-28', 0, 4, 1, 0, 0)
        hotel('ae', did, 'Alexandria', 'Steigenberger Cecil', '2026-10-28', '2026-10-30', 0, 2, 0, 0, 0)
        pickup('ae', did, 'Cairo Intl Airport — Hall 2', '13:20', 'Visa-on-arrival counter then meet guide')
        pickup('ae', did, 'Giza pyramid gate', '08:00', 'Camel ride vendors — guests advised')
        block('ae', did, ids[('ae', 'veh')], 1, 'blocked', 'Driver seat')
        booking('ae', did, 'TB-AE-001', 'Haddad family', 'Leila Haddad', '+971 50 555 4471',
                34000, 27000, 34000, 'card', 'full', 'confirmed',
                '5 pax — 2 doubles + 1 single', [
                    ('Leila Haddad', 'female', 34, 'P7712083', 'double', 'CAI-110', 2, 'checked_in'),
                    ('Karim Haddad', 'male', 38, 'P7712090', 'double', 'CAI-110', 3, 'checked_in'),
                    ('Yara Haddad', 'female', 8, 'P7712106', 'double', 'CAI-110', 4, 'checked_in'),
                ])
        booking('ae', did, 'TB-AE-002', 'Kumar couple', 'Ramesh Kumar', '+971 55 555 9902',
                13600, 11200, 0, 'bank', 'unpaid', 'confirmed',
                '2 pax — 1 double', [
                    ('Ramesh Kumar', 'male', 45, 'S4420917', 'double', 'CAI-208', 5, None),
                    ('Divya Ramesh', 'female', 42, 'S4420924', 'double', 'CAI-208', 6, None),
                ])

    def ae_dep2(pid):
        did = dep('ae', '2026-12-18', '2026-12-23', 'pending', 'Winter market — min 6 pax to confirm')
        veh('ae', did, 'Toyota Hiace', 'Van 1 — Baku transfers', 'AZ-7712', 14)
        hotel('ae', did, 'Baku', 'Fairmont Baku Flame Towers', '2026-12-18', '2026-12-23', 0, 3, 0, 0, 0)
        pickup('ae', did, 'Heydar Aliyev Intl — arrivals', '16:40', 'e-visa counter then exit gate 3')
        booking('ae', did, 'TB-AE-003', 'Rajagopal couple', 'Priya Rajagopal', '+971 52 555 3320',
                18400, 15200, 9200, 'online', 'partial', 'confirmed',
                '2 pax — 1 double', [
                    ('Priya Rajagopal', 'female', 33, 'P9033712', 'double', 'BAK-301', 1, None),
                    ('Arun Rajagopal', 'male', 35, 'P9033729', 'double', 'BAK-301', 2, None),
                ])

    pkg('ae', 'Egypt 5 Nights — Cairo & Alexandria', 'custom', 6, 6800,
        'Return airfare ex-DXB, 5★ Cairo + 5★ Alexandria hotels, Nile dinner cruise, pyramids entry, guide',
        'Egypt visa, tips, lunches, optional camel ride',
        'Al-Hussein Mosque, Sayyida Zainab & Imam Shafi shrines (Cairo)',
        'Pyramids, Egyptian Museum, Khan el-Khalili bazaar and the Alexandria corniche — the full Egyptian classic.',
        [
            (1, 'visit', 'Arrive Cairo — hotel check-in', 'Cairo', '13:20', 'Nile dinner cruise 19:00'),
            (2, 'ziyarat', 'Al-Hussein Mosque & Khan el-Khalili', 'Cairo', '09:30', 'Friday prayer at Al-Hussein'),
            (3, 'visit', 'Giza pyramids & Egyptian Museum', 'Giza', '08:00', 'Guide includes museum highlights'),
            (4, 'visit', 'Transfer to Alexandria — corniche walk', 'Alexandria', '09:00', 'Qaitbay citadel photo stop'),
            (5, 'visit', 'Bibliotheca Alexandrina & Stanley Bridge', 'Alexandria', '10:00', 'Library guided tour'),
            (6, 'visit', 'Fly back — CAI to DXB', 'Cairo', '18:00', 'Airport transfer 15:00'),
        ], [ae_dep1])

    pkg('ae', 'Baku 4 Nights Getaway', 'custom', 5, 9200,
        'Return airfare ex-DXB, 5★ Flame Towers hotel, old city tour, Gabala day trip, breakfast',
        'Azerbaijan e-visa, cable car at Gabala, meals',
        None,
        'Winter Baku: Flame Towers, Icherisheher old city, mud volcanoes and a Gabala mountain day.',
        [
            (1, 'visit', 'Arrive Baku — Flame Towers check-in', 'Baku', '16:40', 'Evening fountain show walk'),
            (2, 'visit', 'Icherisheher old city & Flame Towers', 'Baku', '10:00', 'Maiden Tower entry included'),
            (3, 'visit', 'Gabala day trip — mountains & cable car', 'Gabala', '08:30', 'Option: Tufandag resort'),
            (4, 'visit', 'Mud volcanoes & Gobustan petroglyphs', 'Gobustan', '09:30', 'Off-road transfer'),
            (5, 'visit', 'Departure — GYD to DXB', 'Baku', '20:00', 'Airport transfer 17:30'),
        ], [ae_dep2])

    # ================= HARAMAIN (SA) =================
    def sa_dep1(pid):
        did = dep('sa', '2026-10-24', '2026-10-24', 'confirmed', 'Day hike — weather cleared')
        veh('sa', did, 'GMC Yukon XL', 'SUV 1 — trail group', 'SAB-3390', 7)
        pickup('sa', did, 'Haramain Hotel — Jeddah lobby', '06:00', 'Trailhead 90 min drive')
        pickup('sa', did, 'Edge of the World trailhead', '07:30', 'Hike starts promptly — 2L water per person')
        block('sa', did, ids[('sa', 'veh')], 1, 'blocked', 'Driver seat')
        block('sa', did, ids[('sa', 'veh')], 6, 'blocked', 'Guide equipment')
        booking('sa', did, 'TB-SA-004', 'Otaibi group hike', 'Bandar Al Otaibi', '+966 55 555 6612',
                5400, 2700, 5400, 'cash', 'full', 'confirmed',
                '6 hikers — one SUV', [
                    ('Bandar Al Otaibi', 'male', 29, 'P4154412', None, None, 2, 'picked_up'),
                    ('Salem Al Otaibi', 'male', 31, 'P4154429', None, None, 3, 'picked_up'),
                    ('Faisal Al Qahtani', 'male', 27, 'P4154436', None, None, 4, 'picked_up'),
                    ('Nasser Al Dosari', 'male', 33, 'P4154443', None, None, 5, 'picked_up'),
                ])
        booking('sa', did, 'TB-SA-005', 'Ziyarah staff team', 'Yousef Al Harbi', '+966 56 118 9001',
                2700, 1350, 0, 'none', 'unpaid', 'confirmed',
                '2 hikers — staff outing', [
                    ('Yousef Al Harbi', 'male', 34, 'P4151990', None, None, 7, None),
                    ('Hatem Al Zahran', 'male', 30, 'P4152006', None, None, 8, None),
                ])

    def sa_dep2(pid):
        did = dep('sa', '2026-12-24', '2026-12-28', 'confirmed', 'Christmas week — Habitas AlUla confirmed')
        veh('sa', did, 'Land Cruiser', 'SUV 1 — AlUla runs', 'SAB-8814', 6)
        hotel('sa', did, 'AlUla', 'Habitas AlUla', '2026-12-24', '2026-12-28', 1, 2, 0, 0, 0)
        pickup('sa', did, 'Prince Abdul Majeed Intl Airport — AlUla', '14:10', 'Domestic arrival SV-1580')
        pickup('sa', did, 'Hegra visitor centre', '08:30', 'Hegra tour with rawi guide'),
        block('sa', did, ids[('sa', 'veh')], 1, 'blocked', 'Driver seat')
        booking('sa', did, 'TB-SA-006', 'Ghamdi couple', 'Reem Al Ghamdi', '+966 50 555 8841',
                4200, 3300, 4200, 'card', 'full', 'confirmed',
                '2 pax — 1 double villa', [
                    ('Reem Al Ghamdi', 'female', 31, 'P4177881', 'double', 'ALU-villa-3', 2, None),
                    ('Saud Al Ghamdi', 'male', 34, 'P4177900', 'double', 'ALU-villa-3', 3, None),
                ])

    def sa_dep3(pid):
        did = dep('sa', '2026-06-18', '2026-06-23', 'cancelled', 'Cancelled — summer heat advisory, guests rebooked to October')
        veh('sa', did, 'GMC Safari', 'Van 1 — Abha runs', 'SAB-1145', 12)
        hotel('sa', did, 'Abha', 'Blue Inn Abha', '2026-06-18', '2026-06-23', 0, 2, 0, 0, 0)
        pickup('sa', did, 'Abha Intl Airport', '11:20', 'Cancelled — flight refunded')

    pkg('sa', 'Edge of the World Day Hike', 'custom', 1, 150,
        'Round-trip transport from Jeddah, licensed trail guide, water & snacks, park permits',
        'Lunch, hiking boots rental, travel insurance',
        None,
        'The famous Jebel Fihrayn escarpment — a 2-hour guided hike to the cliff edge 90 km north of Riyadh.',
        [
            (1, 'visit', 'Jeddah pickup & drive to trailhead', 'Jeddah → Jebel Fihrayn', '06:00', '90-minute drive'),
            (1, 'visit', 'Guided hike to the cliff edge', 'Edge of the World', '07:30', 'Return by 11:00'),
            (1, 'visit', 'Sunset point & return to Jeddah', 'Jebel Fihrayn', '16:00', 'Arrive city ~18:30'),
        ], [sa_dep1])

    pkg('sa', 'AlUla Winter — 3 Nights', 'custom', 4, 2100,
        '3 nights Habitas AlUla, Hegra rawi-guided tour, Maraya concert hall visit, all transfers',
        'Flights, travel insurance, bike rental at AlUla old town',
        None,
        'Winter in AlUla: Hegra tombs, Elephant Rock, Maraya mirror hall and the old-town night market.',
        [
            (1, 'visit', 'Arrive AlUla — Habitas check-in', 'AlUla', '14:10', 'Evening: old town night market'),
            (2, 'visit', 'Hegra — UNESCO tombs with rawi guide', 'Hegra', '08:30', 'Rawi guide included'),
            (3, 'visit', 'Elephant Rock & stargazing dinner', 'AlUla', '10:00', 'Jeep transfer to rock arch'),
            (4, 'visit', 'Maraya hall & departure', 'AlUla', '11:00', 'Airport transfer for SV-1581'),
        ], [sa_dep2, sa_dep3])

    ins('tour_packages', pkg_rows)
    ins('tour_itinerary', itin_rows)
    ins('tour_departures', dep_rows)
    ins('tour_departure_vehicles', veh_rows)
    ins('tour_departure_hotels', hot_rows)
    ins('tour_departure_pickups', pick_rows)
    ins('tour_seat_blocks', blk_rows)
    ins('tour_bookings', bk_rows)
    ins('tour_passengers', pax_rows)
    print(f'tour module seeded: {len(pkg_rows)} packages, {len(dep_rows)} departures, {len(bk_rows)} bookings, {len(pax_rows)} passengers')


if __name__ == '__main__':
    q = _q
    # resolve agency ids from live DB
    rows = q("select id, name from agencies;")
    by_name = {r['name']: r['id'] for r in rows}
    AG = {}
    for k, frag in [('pk', 'Al-Noor'), ('ae', 'Emirates'), ('sa', 'Haramain')]:
        match = [n for n in by_name if frag in n]
        assert match, f'agency {frag} not found'
        AG[k] = by_name[match[0]]
    # wipe tour tables only
    q('TRUNCATE TABLE ' + ', '.join(TOUR_TABLES) + ' CASCADE;')
    run(AG)
