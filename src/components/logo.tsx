import Image from 'next/image'
import { cn } from '@/lib/cn'

/** The BUCS seal as a static mark (nav, login, sidebar). */
export function Logo({
  size = 24,
  className,
  priority = false,
}: {
  size?: number
  className?: string
  priority?: boolean
}) {
  return (
    <Image
      src="/bucs-logo.png"
      alt="Bicol University College of Science"
      width={size}
      height={size}
      priority={priority}
      className={cn('shrink-0 object-contain', className)}
    />
  )
}
