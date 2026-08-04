do $$
begin
  update public.churches
  set
    password_hash = 'scrypt$16384$8$1$UM8_r_MowKR7BAd_kGmORQ$CYAqnxgz-6BZngK5pYSpc9Fsra0l8q4aiCEX6Eiduw71wn8XMsblebyPm_pQz3G3CwVp301YznZ-Su9sAlYegg',
    updated_at = now()
  where slug = 'redeemer-christian-church';

  if not found then
    raise exception 'Redeemer Christian Church login was not found';
  end if;
end
$$;
