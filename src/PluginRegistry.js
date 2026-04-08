class PluginRegistry {
  constructor() {
    this.plugins = [];
  }

  register(plugin) {
    this.plugins.push(plugin);
    console.log(`🔌 Plugin Registered: ${plugin.name}`);
  }

  getAdminTabs() {
    return this.plugins.filter(p => p.adminTab).map(p => p.adminTab);
  }

  renderAdminPanel(currentTab, contextProps) {
    const plugin = this.plugins.find(p => p.adminTab && p.adminTab.id === currentTab);
    return plugin && plugin.renderAdminPanel ? plugin.renderAdminPanel(contextProps) : null;
  }

  renderHomeWidgets(contextProps) {
    return this.plugins.filter(p => p.renderHomeWidget).map((p, index) => p.renderHomeWidget({ ...contextProps, key: `widget-${index}` }));
  }

  renderPages(currentPage, contextProps) {
    const plugin = this.plugins.find(p => p.pageRoute === currentPage);
    return plugin && plugin.renderPage ? plugin.renderPage(contextProps) : null;
  }
}

export const registry = new PluginRegistry();