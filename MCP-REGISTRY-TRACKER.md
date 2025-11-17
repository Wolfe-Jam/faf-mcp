# 🎯 FAF Ecosystem Registry Tracker
**Registry of Registries - Marketplace Submission Status**

**Tracking:** MCP Servers (faf-mcp, claude-faf-mcp) + CLI Toolchain (faf-cli)

Last Updated: 2025-11-17

---

## 📊 OVERVIEW STATS

**Total Registries:** 13+ (MCP + CLI marketplaces)
**Live:** 3 (2 MCP, 1 CLI)
**Pending:** 4 (1 MCP auto, 3 MCP manual)
**In Progress:** 2 (1 MCP, 1 comms)
**Todo:** 5+

**Combined Reach:**
- MCP: 1,000+ servers, 44+ curated
- CLI: npm, Homebrew, developer tools

**Total Ecosystem Downloads:** 14.2k+ (6.7k CLI, 7.5k MCP)

---

## 🟢 LIVE (Published & Active)

### 1. Anthropic MCP Servers (Official)
- **Status:** ✅ LIVE (MERGED)
- **Package:** claude-faf-mcp
- **Date Published:** October 17, 2025
- **PR/Issue:** [PR #2759](https://github.com/modelcontextprotocol/servers/pull/2759)
- **Impact:** CRITICAL - Official Anthropic validation
- **Visibility:** Listed in official Anthropic MCP repository
- **Downloads:** 6.8k npm downloads
- **Notes:** First .faf format server validated by Anthropic. Championship credential.
- **URL:** https://github.com/modelcontextprotocol/servers

### 2. MCPServers.org
- **Status:** ✅ LIVE (Accepted)
- **Package:** faf-mcp
- **Date Published:** ~November 2025
- **Confirmation:** Email #2 received
- **Impact:** MEDIUM - Community visibility
- **Visibility:** Listed in community directory
- **Notes:** Community-driven registry
- **URL:** https://mcpservers.org

### 3. npm Registry (CLI)
- **Status:** ✅ LIVE (Published)
- **Package:** faf-cli
- **Date Published:** October 2025 (v3.1.6 current)
- **Impact:** CRITICAL - Primary distribution channel
- **Visibility:** Official npm package registry
- **Downloads:** 6.7k total downloads
- **Notes:** Championship CLI toolchain, 41 commands, <50ms performance
- **URL:** https://www.npmjs.com/package/faf-cli

---

## 🟡 PENDING (Submitted, Awaiting Approval)

### 4. Smithery.ai
- **Status:** ⏳ PENDING
- **Package:** faf-mcp
- **Date Submitted:** November 2025
- **Method:** GitHub OAuth automated listing
- **Impact:** MEDIUM - Developer marketplace
- **Expected Timeline:** Automatic processing
- **Notes:** Submitted via authenticated GitHub connection
- **URL:** https://smithery.ai
- **Next Action:** Wait for automated approval

### 5. Pulse DevOps (MCP Registry)
- **Status:** ⏳ PENDING
- **Package:** faf-mcp
- **Date Submitted:** November 2025
- **Method:** Manual submission (awaiting response)
- **Impact:** MEDIUM - DevOps-focused MCP directory
- **Expected Timeline:** Manual review
- **Notes:** Waiting on approval
- **URL:** TBD
- **Next Action:** Wait for approval notification

### 6. PunkPeye (MCP Registry)
- **Status:** ⏳ PENDING
- **Package:** faf-mcp
- **Date Submitted:** November 2025
- **Method:** Manual submission (awaiting response)
- **Impact:** MEDIUM - Community MCP directory
- **Expected Timeline:** Manual review
- **Notes:** Waiting on approval
- **URL:** TBD
- **Next Action:** Wait for approval notification

### 7. Achypher (MCP Registry)
- **Status:** ⏳ PENDING
- **Package:** faf-mcp
- **Date Submitted:** November 2025
- **Method:** Manual submission (awaiting response)
- **Impact:** MEDIUM - Developer MCP directory
- **Expected Timeline:** Manual review
- **Notes:** Waiting on approval
- **URL:** TBD
- **Next Action:** Wait for approval notification

---

## 🔵 IN PROGRESS (Active Submission)

### 8. GitHub MCP Registry (OSS)
- **Status:** 🔄 IN PROGRESS
- **Package:** faf-mcp (universal)
- **Date Started:** November 17, 2025
- **Method:** mcp-publisher CLI
- **Impact:** CRITICAL - Official GitHub backing, 44+ curated partners
- **Current Step:** Awaiting GitHub authentication (code: 7D9E-9A2B)
- **Tool:** `/usr/local/bin/mcp-publisher`
- **server.json:** ✅ Ready (v1.1.1, description fixed to 87 chars)
- **Visibility:**
  - OSS MCP Community Registry (1,000+ servers)
  - GitHub MCP Registry (44+ curated)
  - Auto-sync to downstream registries
- **Notes:** Universal package targeting ALL MCP platforms (Cursor, Windsurf, Cline, VS Code)
- **URL:** https://github.com/mcp
- **Next Action:** Complete GitHub OAuth at https://github.com/login/device, then `mcp-publisher publish`

### 9. Cursor.directory (MCP Marketplace)
- **Status:** 🔄 IN PROGRESS
- **Package:** faf-mcp
- **Date Started:** November 2025
- **Method:** Working on submission
- **Impact:** HIGH - Cursor IDE has large developer base
- **Current Step:** Researching submission requirements
- **Notes:** IDE-specific marketplace
- **URL:** TBD (cursor.directory)
- **Next Action:** Complete submission research, prepare materials

### 10. Warp Terminal (Communications)
- **Status:** 🔄 IN PROGRESS (Communications)
- **Package:** faf-mcp
- **Date Started:** November 2025
- **Method:** Slack outreach
- **Impact:** HIGH - Terminal-first developers
- **Current Step:** On Slack, waiting for response
- **Notes:** Reached out but no response yet
- **URL:** warp.dev
- **Next Action:** Continue monitoring Slack, follow up if needed

---

## ⚪ TODO (Not Yet Started)

### MCP Server Marketplaces

### 11. LobeHub
- **Status:** 📝 TODO
- **Package:** faf-mcp
- **Priority:** HIGH (Tier 2)
- **Impact:** MEDIUM - Community MCP server directory
- **URL:** https://lobehub.com/mcp
- **Notes:** Community-driven MCP discovery platform
- **Research Needed:** Submission process, requirements
- **Next Action:** Research submission requirements

### 12. Cline MCP Marketplace
- **Status:** 📝 TODO (Working On It)
- **Package:** faf-mcp
- **Priority:** HIGH (Tier 2)
- **Impact:** MEDIUM - Growing ecosystem
- **URL:** TBD
- **Notes:** Cline-specific MCP listing, working on submission
- **Research Needed:** Finalize submission process
- **Next Action:** Complete submission materials

### CLI Tool Marketplaces

### 13. Homebrew (macOS/Linux)
- **Status:** 📝 TODO
- **Package:** faf-cli
- **Priority:** HIGH - macOS developer audience
- **Impact:** MEDIUM-HIGH - Popular package manager for developers
- **URL:** https://brew.sh
- **Notes:** Need to create Homebrew formula for faf-cli
- **Requirements:** Formula file, GitHub releases with binaries
- **Research Needed:** Homebrew formula creation, tap vs core
- **Next Action:** Create Homebrew formula, submit to tap

### 14. awesome-lists (GitHub)
- **Status:** 📝 TODO
- **Package:** faf-cli + faf-mcp
- **Priority:** MEDIUM - Developer discovery
- **Impact:** MEDIUM - Good for SEO and discovery
- **Targets:**
  - awesome-cli-apps
  - awesome-developer-tools
  - awesome-mcp-servers (already in some)
  - awesome-ai-tools
- **Notes:** PR submissions to relevant awesome lists
- **Next Action:** Identify relevant awesome lists, submit PRs

---

## 📦 PACKAGE DISTRIBUTION STRATEGY

### MCP Servers

#### claude-faf-mcp (Claude Desktop-Specific)
- **Target:** Claude Desktop users
- **Positioning:** Official Anthropic-approved MCP server
- **Downloads:** 6.8k
- **Status:** Established, proven, championship-grade
- **Registries:** Anthropic MCP Servers (official)
- **Distribution:** npm only

#### faf-mcp (Universal - ALL Platforms)
- **Target:** Cursor, Windsurf, Cline, VS Code, Claude, all MCP platforms
- **Positioning:** Universal project context for any MCP platform
- **Downloads:** 700
- **Status:** New universal package, same championship codebase
- **Registries:** GitHub MCP (in progress), MCPServers.org (live), Smithery.ai (pending), + 3 todo
- **Distribution:** npm only

### CLI Toolchain

#### faf-cli (Command-Line Tools)
- **Target:** Developers using terminal workflows
- **Positioning:** Championship CLI for .faf format operations
- **Downloads:** 6.7k
- **Status:** Established, 41 commands, <50ms performance
- **Registries:** npm (live), Homebrew (todo), awesome-lists (todo)
- **Distribution:** npm (primary), Homebrew (planned)

**Combined Ecosystem Downloads:** 14.2k+ (7.5k MCP, 6.7k CLI)

---

## 🎯 STRATEGIC PRIORITIES

### MCP Servers Priority

**TIER 1 (Critical):**
1. ✅ Anthropic MCP Servers - DONE (claude-faf-mcp)
2. 🔄 GitHub MCP Registry - IN PROGRESS (faf-mcp)

**TIER 2 (High Priority):**
3. ⏳ Smithery.ai - PENDING (faf-mcp)
4. ⏳ Pulse DevOps - PENDING (faf-mcp)
5. ⏳ PunkPeye - PENDING (faf-mcp)
6. ⏳ Achypher - PENDING (faf-mcp)
7. 🔄 Cursor.directory - IN PROGRESS (faf-mcp)
8. 📝 LobeHub - TODO (faf-mcp)
9. 📝 Cline MCP Marketplace - TODO (Working On It) (faf-mcp)

**TIER 3 (Medium Priority):**
10. ✅ MCPServers.org - DONE (faf-mcp)
11. 🔄 Warp Terminal - IN PROGRESS (Communications) (faf-mcp)

### CLI Tools Priority

**TIER 1 (Critical):**
1. ✅ npm Registry - DONE (faf-cli v3.1.6)

**TIER 2 (High Priority):**
2. 📝 Homebrew Formula - TODO (faf-cli)

**TIER 3 (Medium Priority):**
3. 📝 awesome-lists - TODO (faf-cli + faf-mcp)

---

## 📈 SUCCESS METRICS

**Visibility Reach:**
- Official Anthropic validation ✅
- GitHub MCP Registry (44+ curated partners) 🔄
- OSS MCP Registry (1,000+ servers) 🔄
- 3+ additional community marketplaces

**Package Adoption:**
- claude-faf-mcp: 6.8k downloads (established)
- faf-mcp: 700 downloads (growing)
- Combined: 14.2k+ ecosystem downloads

**Market Coverage:**
- Claude Desktop ✅ (claude-faf-mcp)
- Universal MCP platforms 🔄 (faf-mcp)
- Cross-platform discovery 🔄

---

## 🔄 UPDATE LOG

**2025-11-17 (Later):**
- Fixed server.json description (100 char max → 87 chars)
- Updated auth code to 7D9E-9A2B
- Added 3 new PENDING registries: Pulse DevOps, PunkPeye, Achypher
- Added Cursor.directory to IN PROGRESS
- Added Warp Terminal to IN PROGRESS (Communications)
- Total registries now: 14 (up from 10)

**2025-11-17 (Earlier):**
- Started GitHub MCP Registry submission (faf-mcp)
- Updated server.json to v1.1.1
- Initiated mcp-publisher authentication
- Created this tracking document

**2025-11-16:**
- Submitted to Smithery.ai (faf-mcp)
- Updated all Discord links to working invite

**2025-10-17:**
- claude-faf-mcp merged into Anthropic MCP Servers (PR #2759)

**November 2025:**
- Accepted to MCPServers.org (faf-mcp)

---

## 📋 NEXT ACTIONS

**Immediate (Today):**
1. [ ] Complete GitHub OAuth authentication (code: 7D9E-9A2B)
2. [ ] Run `mcp-publisher publish` for faf-mcp
3. [ ] Verify faf-mcp appears in OSS MCP Registry
4. [ ] Verify auto-sync to GitHub MCP Registry

**This Week:**
5. [ ] Complete Cursor.directory submission research and materials
6. [ ] Research LobeHub submission requirements
7. [ ] Submit faf-mcp to LobeHub
8. [ ] Complete Cline MCP submission
9. [ ] Follow up with Warp on Slack if no response

**Next 2 Weeks:**
10. [ ] Verify Smithery.ai approval
11. [ ] Verify Pulse DevOps approval
12. [ ] Verify PunkPeye approval
13. [ ] Verify Achypher approval

---

## 🏆 COMPETITIVE POSITIONING

**Unique Advantages:**
- ✅ ONLY persistent project context MCP server
- ✅ ONLY IANA-registered format (application/vnd.faf+yaml)
- ✅ ONLY Anthropic-approved persistent context server
- ✅ Works with ALL AI platforms (Claude, Gemini, Codex, any MCP client)
- ✅ Championship performance (19ms average, 16.2x faster than CLI)
- ✅ 14.2k+ downloads, 800+/week growth

**Market Position:**
- Official Anthropic MCP steward (claude-faf-mcp)
- Universal MCP server (faf-mcp)
- FREE FOREVER, MIT License
- Zero dependencies, 100% standalone

---

## 📚 RESOURCES

**MCP Registry Documentation:**
- GitHub MCP Registry: https://github.blog/ai-and-ml/github-copilot/meet-the-github-mcp-registry
- mcp-publisher CLI: https://modelcontextprotocol.info/tools/registry/cli/
- server.json spec: https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/generic-server-json.md

**FAF Package Links:**
- faf-mcp: https://www.npmjs.com/package/faf-mcp
- claude-faf-mcp: https://www.npmjs.com/package/claude-faf-mcp
- faf-cli: https://www.npmjs.com/package/faf-cli

**Repository Links:**
- faf-mcp: https://github.com/Wolfe-Jam/faf-mcp
- claude-faf-mcp: https://github.com/Wolfe-Jam/claude-faf-mcp
- faf-cli: https://github.com/Wolfe-Jam/faf-cli

---

**Built with F1-inspired engineering principles** 🏎️⚡

*Registry of Registries - Because tracking the trackers is meta-championship* 😄
