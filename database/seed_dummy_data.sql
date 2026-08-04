-- =========================================================
-- HRIS Al-Falah — Dummy data seed (10 employees for trial/testing)
-- Safe to run repeatedly: employee_number is unique, inserts use
-- ON CONFLICT DO NOTHING where sensible. Run after schema.sql +
-- rls_policies.sql + batch1 + batch2 + batch3.
-- =========================================================

insert into m_unit_kerja (kode, nama) values ('YAY','Yayasan'),('PPTQ','Pondok Tahfizh') on conflict (kode) do nothing;
insert into m_departemen (kode, nama) values ('AKD','Akademik'),('ADM','Administrasi'),('TAH','Tahfizh') on conflict (kode) do nothing;
insert into m_jabatan (kode, nama) values ('GR','Guru'),('STF','Staf'),('KA','Kepala Bagian'),('WK','Wakil Kepala') on conflict (kode) do nothing;
insert into m_status_kepegawaian (kode, nama) values ('TETAP','Tetap'),('KONTRAK','Kontrak') on conflict (kode) do nothing;
insert into m_jenis_kepegawaian (kode, nama) values ('FT','Full-Time'),('PT','Part-Time') on conflict (kode) do nothing;
insert into m_bank (kode, nama) values ('BSI','Bank Syariah Indonesia'),('MANDIRI','Bank Mandiri') on conflict (kode) do nothing;
insert into m_agama (nama) values ('Islam') on conflict (nama) do nothing;
insert into m_status_perkawinan (nama) values ('Menikah'),('Belum Menikah') on conflict (nama) do nothing;

do $$
declare
  v_unit uuid; v_dept uuid; v_jab uuid; v_status uuid; v_jenis uuid; v_bank uuid; v_agama uuid; v_kawin uuid;
  v_emp uuid;
  i int;
  names text[] := array['Ahmad Fauzi','Siti Nurhaliza','Budi Santoso','Dewi Kartika','Muhammad Rizki',
                         'Nur Aini','Agus Salim','Rina Wulandari','Hasan Basri','Lestari Handayani'];
  jab_codes text[] := array['GR','STF','GR','STF','KA','GR','WK','STF','GR','GR'];
begin
  select id into v_unit from m_unit_kerja where kode='PPTQ';
  select id into v_dept from m_departemen where kode='AKD';
  select id into v_status from m_status_kepegawaian where kode='TETAP';
  select id into v_jenis from m_jenis_kepegawaian where kode='FT';
  select id into v_bank from m_bank where kode='BSI';
  select id into v_agama from m_agama where nama='Islam';
  select id into v_kawin from m_status_perkawinan where nama='Menikah';

  for i in 1..10 loop
    select id into v_jab from m_jabatan where kode = jab_codes[i];

    insert into employees (
      employee_number, full_name, unit_kerja_id, departemen_id, jabatan_id,
      status_kepegawaian_id, jenis_kepegawaian_id, bank_id, agama_id, status_perkawinan_id,
      institution_email, phone, nik, basic_salary, join_date, contract_end
    ) values (
      'EMP' || lpad(i::text, 3, '0'),
      names[i],
      v_unit, v_dept, v_jab, v_status, v_jenis, v_bank, v_agama, v_kawin,
      lower(replace(names[i], ' ', '.')) || '@alfalahabulamu.test',
      '0812' || lpad((10000000 + i)::text, 8, '0'),
      '35' || lpad((1000000000000 + i)::text, 14, '0'),
      4500000 + (i * 150000),
      current_date - ((i * 120) || ' days')::interval,
      case when i <= 3 then current_date + ((15 + i*5) || ' days')::interval else null end -- first 3 have contracts expiring soon, for testing fn_check_expiring_contracts
    )
    on conflict (employee_number) do nothing
    returning id into v_emp;

    if v_emp is null then
      select id into v_emp from employees where employee_number = 'EMP' || lpad(i::text, 3, '0');
    end if;

    -- employee_contacts: one emergency contact each
    insert into employee_contacts (employee_id, contact_type, full_name, relationship, phone, is_primary)
    values (v_emp, 'emergency', names[i] || ' (Keluarga)', 'Orang Tua/Wali', '0813' || lpad((20000000+i)::text,8,'0'), true)
    on conflict do nothing;

    -- employee_bank_accounts
    insert into employee_bank_accounts (employee_id, bank_id, account_number, account_holder_name, is_primary)
    values (v_emp, v_bank, lpad((7000000000 + i)::text, 12, '0'), names[i], true)
    on conflict do nothing;

    -- employee_payroll_components: basic salary + one allowance
    insert into employee_payroll_components (employee_id, component_type_id, amount, effective_from)
    select v_emp, id, 4500000 + (i*150000), current_date - ((i*120) || ' days')::interval from payroll_component_types where code='BASIC';
    insert into employee_payroll_components (employee_id, component_type_id, amount, effective_from)
    select v_emp, id, 300000, current_date - ((i*120) || ' days')::interval from payroll_component_types where code='TUNJ_MAKAN';

    -- employee_certifications: half the employees have one
    if i % 2 = 0 then
      insert into employee_certifications (employee_id, certificate_name, issuer, issue_date)
      values (v_emp, 'Sertifikat Pendidik', 'Kementerian Agama', current_date - '2 years'::interval);
    end if;

    -- employee_competencies
    insert into employee_competencies (employee_id, skill_name, competency_level_id, years_experience)
    select v_emp, 'Tahfizh Al-Quran', id, (i % 5) + 1 from competency_levels where code='ADVANCED';

    -- employee_languages
    insert into employee_languages (employee_id, language_id, proficiency_level_id)
    select v_emp, l.id, cl.id from languages l, competency_levels cl where l.code='AR' and cl.code='INTERMEDIATE'
    on conflict do nothing;

    -- employee_leave_balances for the current year
    insert into employee_leave_balances (employee_id, leave_type, year, entitled_days)
    values (v_emp, 'Cuti Tahunan', extract(year from current_date)::int, 12)
    on conflict do nothing;

    -- employee_attendance_settings
    insert into employee_attendance_settings (employee_id, shift_type_id, effective_from)
    select v_emp, id, current_date - ((i*120) || ' days')::interval from shift_types where code='REGULER';

    -- employee_trainings: a third of employees
    if i % 3 = 0 then
      insert into employee_trainings (employee_id, training_name, provider, training_type, start_date, end_date, duration_hours, result)
      values (v_emp, 'Pelatihan Kurikulum Merdeka', 'Dinas Pendidikan', 'Eksternal', current_date - '30 days'::interval, current_date - '28 days'::interval, 16, 'Lulus');
    end if;

    -- employee_rewards: employee 1 and 5
    if i in (1,5) then
      insert into employee_rewards (employee_id, reward_name, category, reward_date, given_by)
      values (v_emp, 'Guru Teladan', 'Penghargaan', current_date - '90 days'::interval, 'Kepala Sekolah');
    end if;

    -- performance_reviews: give everyone a review (approved), which will also
    -- exercise fn_notify_performance_review via the trigger.
    insert into performance_reviews (employee_id, review_period, score_discipline, score_quality, score_productivity, score_teamwork, score_initiative, score_adab, status_approval)
    values (v_emp, extract(year from current_date)::text || '-S1', 80 + (i % 15), 80 + (i % 10), 78 + (i % 12), 82 + (i % 8), 79 + (i % 11), 85 + (i % 10), 'Disetujui');

  end loop;
end $$;

select 'Dummy data inserted: ' || count(*) || ' employees' as result from employees where employee_number like 'EMP0%';
