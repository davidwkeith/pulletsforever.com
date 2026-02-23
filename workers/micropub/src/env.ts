/**
 * Worker environment bindings for the Micropub endpoint
 */
export interface Env {
  SITE_URL: string;
  GITLAB_PROJECT_ID: string;
  GITLAB_BRANCH: string;
  BLOG_PATH: string;
  MEDIA_URL: string;
  MAX_FILE_SIZE: string;
  MEDIA_BUCKET: R2Bucket;
  GITLAB_TOKEN: string;
}
