import 'leaflet';

declare module 'leaflet.markercluster';

declare module 'leaflet' {
  interface MarkerClusterGroupOptions {
    chunkedLoading?: boolean;
    showCoverageOnHover?: boolean;
    spiderfyOnMaxZoom?: boolean;
    maxClusterRadius?: number;
    iconCreateFunction?: (cluster: MarkerCluster) => Icon | DivIcon;
  }

  interface MarkerCluster {
    getChildCount(): number;
  }

  interface MarkerClusterGroup extends FeatureGroup {
    clearLayers(): this;
  }

  function markerClusterGroup(options?: MarkerClusterGroupOptions): MarkerClusterGroup;
}
