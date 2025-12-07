const DEFAULT_API_TARGET = 'http://127.0.0.1:8000';
const RAW_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '');
const API_BASE_URL = import.meta.env.DEV ? '' : (RAW_API_BASE_URL ?? DEFAULT_API_TARGET);

export type Nullable<T> = T | null | undefined;

export interface Series {
  series_id: number;
  title?: Nullable<string>;
  publisher?: Nullable<string>;
  age?: Nullable<string>;
  series_group?: Nullable<string>;
}

export interface ListSeriesResponse {
  series: Series[];
  next_page_token?: Nullable<string>;
}

export interface Issue {
  issue_id: number;
  series_id: number;
  issue_nr: string;
  full_title?: Nullable<string>;
  title?: Nullable<string>;
  subtitle?: Nullable<string>;
  cover_date?: Nullable<string>;
  cover_year?: Nullable<number>;
  variant?: Nullable<string>;
  story_arc?: Nullable<string>;
}

export interface ListIssuesResponse {
  issues: Issue[];
  next_page_token?: Nullable<string>;
}

export interface Copy {
  copy_id: number;
  issue_id: number;
  age?: Nullable<string>;
  barcode?: Nullable<string>;
  clz_comic_id?: Nullable<number>;
  country?: Nullable<string>;
  cover_price?: Nullable<number>;
  covrprice_value?: Nullable<number>;
  custom_label?: Nullable<string>;
  date_sold?: Nullable<string>;
  format?: Nullable<string>;
  grade?: Nullable<string>;
  grader_notes?: Nullable<string>;
  grading_company?: Nullable<string>;
  key_category?: Nullable<string>;
  key_flag?: Nullable<string>;
  key_reason?: Nullable<string>;
  label_type?: Nullable<string>;
  language?: Nullable<string>;
  my_value?: Nullable<number>;
  no_of_pages?: Nullable<number>;
  page_quality?: Nullable<string>;
  price_sold?: Nullable<number>;
  purchase_date?: Nullable<string>;
  purchase_price?: Nullable<number>;
  purchase_store?: Nullable<string>;
  purchase_year?: Nullable<number>;
  raw_slabbed?: Nullable<string>;
  signed_by?: Nullable<string>;
  slab_cert_number?: Nullable<string>;
  sold_year?: Nullable<number>;
  value?: Nullable<number>;
  variant_description?: Nullable<string>;
}

export interface ListCopiesResponse {
  copies: Copy[];
  next_page_token?: Nullable<string>;
}

export type ImageType =
  | 'front'
  | 'back'
  | 'spine'
  | 'staples'
  | 'interior_front_cover'
  | 'interior_back_cover'
  | 'misc';

export type JobStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface ComicImage {
  series_id: number;
  issue_id: number;
  copy_id: number;
  image_type: ImageType;
  file_name: string;
  relative_path: string;
}

export interface ListCopyImagesResponse {
  images: ComicImage[];
}

export interface ImageUploadJob {
  job_id: string;
  series_id: number;
  issue_id: number;
  copy_id: number;
  image_type: ImageType;
  status: JobStatus;
  detail?: Nullable<string>;
  result?: Nullable<ComicImage>;
}

export interface ApiError extends Error {
  status: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: 'application/json',
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    const error: ApiError = new Error(`Request failed (${response.status})`) as ApiError;
    error.status = response.status;
    try {
      const body = await response.json();
      if (body?.detail) {
        error.message = body.detail;
      }
    } catch {
      // no-op
    }
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

function toQuery(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export function buildImageUrl(relativePath: string) {
  if (!relativePath) return '';
  if (/^https?:\/\//i.test(relativePath)) {
    return relativePath;
  }
  const normalized = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${API_BASE_URL}${normalized}`;
}

export async function listSeries(params: {
  pageSize?: number;
  pageToken?: string | null;
  titleSearch?: string | null;
  publisher?: string | null;
} = {}): Promise<ListSeriesResponse> {
  const query = toQuery({
    page_size: params.pageSize,
    page_token: params.pageToken,
    title_search: params.titleSearch,
    publisher: params.publisher,
  });
  return request<ListSeriesResponse>(`/v1/series${query}`);
}

export function getSeries(seriesId: number) {
  return request<Series>(`/v1/series/${seriesId}`);
}

export function listIssues(seriesId: number, params: { pageSize?: number; pageToken?: string | null } = {}) {
  const query = toQuery({
    page_size: params.pageSize,
    page_token: params.pageToken,
  });
  return request<ListIssuesResponse>(`/v1/series/${seriesId}/issues${query}`);
}

export function getIssue(seriesId: number, issueId: number) {
  return request<Issue>(`/v1/series/${seriesId}/issues/${issueId}`);
}

export function listCopies(issueId: number, params: { pageSize?: number; pageToken?: string | null } = {}) {
  const query = toQuery({
    page_size: params.pageSize,
    page_token: params.pageToken,
  });
  return request<ListCopiesResponse>(`/v1/issues/${issueId}/copies${query}`);
}

export function getCopy(issueId: number, copyId: number) {
  return request<Copy>(`/v1/issues/${issueId}/copies/${copyId}`);
}

export function updateCopy(issueId: number, copyId: number, payload: Partial<Copy>) {
  return request<Copy>(`/v1/issues/${issueId}/copies/${copyId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export function listCopyImages(seriesId: number, issueId: number, copyId: number) {
  return request<ListCopyImagesResponse>(`/v1/series/${seriesId}/issues/${issueId}/copies/${copyId}/images`);
}

export function uploadCopyImage(
  seriesId: number,
  issueId: number,
  copyId: number,
  file: File,
  imageType: ImageType,
  signal?: AbortSignal,
) {
  const formData = new FormData();
  formData.append('image_type', imageType);
  formData.append('file', file);
  return fetch(`${API_BASE_URL}/v1/series/${seriesId}/issues/${issueId}/copies/${copyId}/images`, {
    method: 'POST',
    body: formData,
    signal,
  }).then(async (response) => {
    if (!response.ok) {
      const error: ApiError = new Error(`Upload failed (${response.status})`) as ApiError;
      error.status = response.status;
      throw error;
    }
    return (await response.json()) as ImageUploadJob;
  });
}

export function getUploadJob(jobId: string) {
  return request<ImageUploadJob>(`/v1/jobs/${jobId}`);
}

export async function uploadCopyImagesWithPolling(args: {
  seriesId: number;
  issueId: number;
  copyId: number;
  files: File[];
  imageType: ImageType;
  signal?: AbortSignal;
  onStatus?: (payload: { fileName: string; status: JobStatus }) => void;
}): Promise<ComicImage[]> {
  const results: ComicImage[] = [];
  for (const file of args.files) {
    args.onStatus?.({ fileName: file.name, status: 'in_progress' });
    const job = await uploadCopyImage(args.seriesId, args.issueId, args.copyId, file, args.imageType, args.signal);
    const finalJob = await pollJob(job.job_id, args.signal);
    if (finalJob.status === 'failed') {
      args.onStatus?.({ fileName: file.name, status: 'failed' });
      throw new Error(finalJob.detail ?? 'Upload failed');
    }
    const image = finalJob.result;
    if (image) {
      results.push(image);
    }
    args.onStatus?.({ fileName: file.name, status: 'completed' });
  }
  return results;
}

async function pollJob(jobId: string, signal?: AbortSignal) {
  let attempts = 0;
  while (true) {
    if (signal?.aborted) {
      throw new DOMException('Polling aborted', 'AbortError');
    }
    const job = await getUploadJob(jobId);
    if (job.status === 'completed' || job.status === 'failed') {
      return job;
    }
    attempts += 1;
    await wait(Math.min(1500, 500 + attempts * 200));
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { API_BASE_URL };
