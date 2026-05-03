import { useEffect } from 'react'

export interface SeoOptions {
  title?: string
  description?: string
  canonical?: string
  ogTitle?: string
  ogDescription?: string
  schema?: unknown
}

/**
 * Tiny SEO helper for SPA pages — sets document title, meta description,
 * canonical URL, OG tags, and optional JSON-LD schema on mount, and
 * restores the previous values on unmount so navigating away doesn't
 * leak the last page's metadata.
 *
 * No external deps (no react-helmet). Plays nicely with crawlers that
 * execute JS (Googlebot, Bingbot, Facebook, LinkedIn) — they see the
 * updated tags after the page renders.
 */
export function useSeo({ title, description, canonical, ogTitle, ogDescription, schema }: SeoOptions): void {
  useEffect(() => {
    const prev = {
      title: document.title,
      description: getMeta('name', 'description'),
      canonical: getLink('canonical'),
      ogTitle: getMeta('property', 'og:title'),
      ogDescription: getMeta('property', 'og:description'),
      ogUrl: getMeta('property', 'og:url'),
    }

    if (title) document.title = title
    if (description) setMeta('name', 'description', description)
    if (canonical) setLink('canonical', canonical)
    if (ogTitle || title) setMeta('property', 'og:title', ogTitle || title || '')
    if (ogDescription || description) setMeta('property', 'og:description', ogDescription || description || '')
    if (canonical) setMeta('property', 'og:url', canonical)

    let schemaScript: HTMLScriptElement | null = null
    if (schema) {
      schemaScript = document.createElement('script')
      schemaScript.type = 'application/ld+json'
      schemaScript.dataset.seoManaged = 'true'
      schemaScript.textContent = JSON.stringify(schema)
      document.head.appendChild(schemaScript)
    }

    return () => {
      if (prev.title) document.title = prev.title
      if (prev.description) setMeta('name', 'description', prev.description)
      if (prev.canonical) setLink('canonical', prev.canonical)
      if (prev.ogTitle) setMeta('property', 'og:title', prev.ogTitle)
      if (prev.ogDescription) setMeta('property', 'og:description', prev.ogDescription)
      if (prev.ogUrl) setMeta('property', 'og:url', prev.ogUrl)
      if (schemaScript) schemaScript.remove()
    }
  }, [title, description, canonical, ogTitle, ogDescription, JSON.stringify(schema || {})])
}

function getMeta(attr: 'name' | 'property', value: string): string {
  return document.querySelector(`meta[${attr}="${value}"]`)?.getAttribute('content') || ''
}

function setMeta(attr: 'name' | 'property', value: string, content: string): void {
  let el = document.querySelector(`meta[${attr}="${value}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, value)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function getLink(rel: string): string {
  return document.querySelector(`link[rel="${rel}"]`)?.getAttribute('href') || ''
}

function setLink(rel: string, href: string): void {
  let el = document.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}
