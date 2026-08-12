'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import NextLink from 'next/link';
import React from 'react';

export function useNavigate() {
  const router = useRouter();
  return (to: string | number, options?: any) => {
    if (typeof to === 'number') {
       if (to === -1) router.back();
       return;
    }
    if (options?.replace) {
      router.replace(to);
    } else {
      router.push(to);
    }
  };
}

export function useLocation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return {
    pathname: pathname || '',
    search: searchParams?.toString() ? `?${searchParams.toString()}` : '',
    hash: '',
    state: null
  };
}

export const Link = React.forwardRef<HTMLAnchorElement, any>((props, ref) => {
  const { to, ...rest } = props;
  // Next.js Link expects href
  return <NextLink href={to || props.href || '#'} ref={ref} {...rest} />;
});
Link.displayName = 'Link';

export const NavLink = React.forwardRef<HTMLAnchorElement, any>((props, ref) => {
  const { to, href, className, style, children, end, ...rest } = props;
  const pathname = usePathname();
  const target = to || href || '#';
  const isActive = end ? pathname === target : pathname?.startsWith(target);
  
  const computedClassName = typeof className === 'function' ? className({ isActive }) : className;
  const computedStyle = typeof style === 'function' ? style({ isActive }) : style;
  
  return (
    <NextLink href={target} className={computedClassName} style={computedStyle} ref={ref} {...rest}>
      {typeof children === 'function' ? children({ isActive }) : children}
    </NextLink>
  );
});
NavLink.displayName = 'NavLink';

export const Outlet = () => {
    return null;
}
export const Navigate = ({ to }: { to: string }) => {
    const router = useRouter();
    React.useEffect(() => {
        router.replace(to);
    }, [router, to]);
    return null;
}
