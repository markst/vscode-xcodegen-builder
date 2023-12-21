export interface ProjectConfig {
  name?: string;
  options?: {
    bundleIdPrefix?: string;
  };
  packages?: Record<string, { path: string }>;
  targets?: Record<
    string,
    {
      type?: string;
      platform?: string;
      deploymentTarget?: string;
      sources?: string[];
      dependencies?: Array<{
        sdk?: string;
        package?: string;
      }>;
      settings?: {
        base?: Record<string, string>;
      };
    }
  >;
}
