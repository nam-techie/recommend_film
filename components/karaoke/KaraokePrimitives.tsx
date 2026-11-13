'use client'

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { useId } from 'react'
import { LoaderCircle, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import styles from './KaraokeStage.module.css'

export function StageButton({ children, primary, quiet, working, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean; quiet?: boolean; working?: boolean }) {
  return <Button type="button" {...props} variant={primary ? 'default' : quiet ? 'ghost' : 'outline'} aria-busy={working || undefined} className={`${styles.button} ${primary ? styles.primary : ''} ${className}`}>
    {working && <LoaderCircle className={styles.spinner} aria-hidden="true" size={18} />}{children}
  </Button>
}

export function VolumeSlider({ label, value, onChange, icon = <Volume2 size={18} aria-hidden="true" /> }: { label: string; value: number; onChange: (n: number) => void; icon?: ReactNode }) {
  const id = useId()
  return <label className={styles.volume} htmlFor={id}>
    <span>{icon}{label}<output htmlFor={id}>{value}%</output></span>
    <input id={id} aria-label={label} type="range" min="0" max="100" value={value} onChange={e => onChange(+e.target.value)} style={{ '--range-fill': `${value}%` } as CSSProperties} />
  </label>
}
