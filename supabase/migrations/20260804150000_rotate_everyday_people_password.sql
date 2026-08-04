do $$
begin
  update public.churches
  set
    password_hash = 'scrypt$16384$8$1$fgXP5csdC90AC-xnYc_dWw$RO_qKhVi_BmaZGzZLDVCtZjWl3rn9f2ILzbd_2y3BSVILl8-HiiVGKaAeon1iyFycg7KdZr8mitg20-bkdJXdQ',
    updated_at = now()
  where slug = 'everyday-people-east-coast';

  if not found then
    raise exception 'Everyday People East Coast login was not found';
  end if;
end
$$;
