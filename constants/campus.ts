
// Dynamic campus configuration for multi-marketplace support
// This system automatically loads all colleges from the database

import { supabase } from '@/app/integrations/supabase/client';

// Cache for college data
let collegesCache: College[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface College {
  id: string;
  name: string;
  slug: string;
  email_domains: string[];
  student_population?: number;
  created_at?: string;
}

/**
 * Load all colleges from the database
 * Uses caching to avoid excessive database calls
 */
export async function loadColleges(): Promise<College[]> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (collegesCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return collegesCache;
  }

  try {
    console.log('🎓 Loading colleges from database...');
    const { data, error } = await supabase
      .from('colleges')
      .select('*')
      .order('name');

    if (error) {
      console.error('❌ Error loading colleges:', error);
      // Return cached data if available, even if expired
      if (collegesCache) {
        console.log('⚠️ Using expired cache due to error');
        return collegesCache;
      }
      throw error;
    }

    collegesCache = data || [];
    cacheTimestamp = now;
    console.log(`✅ Loaded ${collegesCache.length} colleges`);
    return collegesCache;
  } catch (error) {
    console.error('❌ Failed to load colleges:', error);
    // Return empty array if no cache available
    return collegesCache || [];
  }
}

/**
 * Get college from email address
 * Automatically matches email domain to college
 */
export async function getCampusFromEmail(email: string): Promise<College | null> {
  if (!email || !email.includes('@')) {
    return null;
  }

  const domain = email.split('@')[1].toLowerCase();
  const colleges = await loadColleges();

  // Find college that has this email domain
  const college = colleges.find(c => 
    c.email_domains && c.email_domains.some(d => d.toLowerCase() === domain)
  );

  if (college) {
    console.log(`🎓 Email ${email} matched to ${college.name} (${college.slug})`);
  } else {
    console.log(`⚠️ Email ${email} domain "${domain}" not found in any college`);
  }

  return college || null;
}

/**
 * Check if email is from an allowed campus
 * Returns true if the email domain matches any college in the database
 */
export async function isAllowedCampusEmail(email: string): Promise<boolean> {
  const college = await getCampusFromEmail(email);
  return college !== null;
}

/**
 * Get college by slug
 */
export async function getCollegeBySlug(slug: string): Promise<College | null> {
  const colleges = await loadColleges();
  return colleges.find(c => c.slug === slug) || null;
}

/**
 * Get college by ID
 */
export async function getCollegeById(id: string): Promise<College | null> {
  const colleges = await loadColleges();
  return colleges.find(c => c.id === id) || null;
}

/**
 * Clear the colleges cache
 * Useful when you know colleges have been updated
 */
export function clearCollegesCache(): void {
  collegesCache = null;
  cacheTimestamp = 0;
  console.log('🗑️ Colleges cache cleared');
}

// Legacy exports for backward compatibility
// These are now async and will load from database
export const CAMPUSES = {
  duke: {
    name: "Duke University",
    domain: "duke.edu",
    slug: "duke",
  },
  unc: {
    name: "University of North Carolina",
    domain: "unc.edu",
    slug: "unc",
  },
};

export const ALLOWED_CAMPUS = "duke.edu"; // Deprecated
export const DUKE_CAMPUS = CAMPUSES.duke; // Deprecated
export const UNC_CAMPUS = CAMPUSES.unc; // Deprecated

console.log("🎓 Campus constants loaded - Dynamic multi-college system ready");
