/**
 * Proposal Creation — Business Orbit's first configured workflow (spec §20–§32).
 *
 * This is configuration, not product. Every rule here is data the engine reads;
 * nothing about proposals appears in engine or UI code.
 */

import type { WorkflowTemplateSeed } from './types'

export const PROPOSAL_CREATION_WORKFLOW: WorkflowTemplateSeed = {
  key: 'proposal_creation',
  name: 'Proposal Creation',
  description:
    'Used whenever the sales team needs a proposal for a company or client.',
  projectKey: 'startup_mela_2027',
  departmentKey: 'sales',
  initialStageKey: 'proposal_request',
  stages: [
    {
      key: 'proposal_request',
      name: 'Proposal Request',
      description: 'Sales records what the client wants and asks for a proposal.',
      instructions:
        'Capture everything the proposal team needs: who the client is, what was discussed, and what they are interested in. Attach anything the client shared.',
      assignees: [{ mode: 'role', roleKey: 'sales' }],
      completionRule: 'any',
      fields: [
        { key: 'client_name', label: 'Client / company name', type: 'text', required: true },
        { key: 'contact_person', label: 'Contact person', type: 'text', required: true },
        { key: 'contact_email', label: 'Contact email', type: 'email', required: true },
        { key: 'contact_phone', label: 'Contact phone', type: 'phone', required: false },
        {
          key: 'discussion_summary',
          label: 'What was discussed',
          type: 'textarea',
          required: true,
        },
        {
          key: 'client_interest',
          label: 'What the client is interested in',
          type: 'textarea',
          required: true,
        },
        {
          key: 'proposal_type',
          label: 'Type of proposal required',
          type: 'select',
          required: true,
          options: ['Sponsorship', 'Exhibitor', 'Partnership', 'Services', 'Other'],
        },
        {
          key: 'potential_deliverables',
          label: 'Potential deliverables',
          type: 'textarea',
          required: false,
        },
        { key: 'expected_deadline', label: 'Expected deadline', type: 'date', required: true },
        { key: 'estimated_value', label: 'Estimated value', type: 'currency', required: false },
        { key: 'additional_notes', label: 'Additional notes', type: 'textarea', required: false },
      ],
      files: [
        {
          key: 'supporting_files',
          label: 'Supporting files',
          required: false,
          acceptedExtensions: ['pdf', 'doc', 'docx', 'xlsx', 'png', 'jpg'],
        },
      ],
      checklist: [],
      priority: 'high',
      dueInHours: 24,
      slaHours: 24,
      requiresApproval: false,
      nextStageKey: 'deliverables_discussion',
    },
    {
      key: 'deliverables_discussion',
      name: 'Deliverables Discussion',
      description:
        'Sales and the content owner agree what the proposal will actually offer.',
      instructions:
        'Agree the package, deliverables, pricing and benefits with the other owner of this stage, then record the final deliverables here.',
      // Two owners: whoever raised the request, plus the content owner (spec §22).
      // Either of them finishing closes the stage.
      assignees: [{ mode: 'initiator' }, { mode: 'role', roleKey: 'proposal_content_owner' }],
      completionRule: 'any',
      fields: [
        {
          key: 'final_deliverables',
          label: 'Final deliverables',
          type: 'textarea',
          required: true,
          helpText: 'What is being offered, at what price, with what benefits.',
        },
        { key: 'pricing_terms', label: 'Pricing and terms', type: 'textarea', required: false },
      ],
      files: [],
      checklist: [],
      priority: 'high',
      dueInHours: 24,
      slaHours: 24,
      requiresApproval: false,
      nextStageKey: 'proposal_content',
    },
    {
      key: 'proposal_content',
      name: 'Proposal Content',
      description: 'Write the complete proposal content from the agreed deliverables.',
      instructions:
        'Write the full proposal content using the request details and the agreed deliverables. Attach any supporting documents the designer will need.',
      assignees: [{ mode: 'role', roleKey: 'proposal_content_owner' }],
      completionRule: 'any',
      fields: [
        {
          key: 'proposal_content',
          label: 'Proposal content',
          type: 'textarea',
          required: true,
        },
        { key: 'content_notes', label: 'Notes for the designer', type: 'textarea', required: false },
      ],
      files: [
        { key: 'content_attachments', label: 'Supporting documents', required: false },
      ],
      checklist: [],
      priority: 'high',
      dueInHours: 48,
      slaHours: 48,
      requiresApproval: false,
      nextStageKey: 'design_formatting',
    },
    {
      key: 'design_formatting',
      name: 'Design & Formatting',
      description: 'Place the approved content into the template and design the proposal.',
      instructions:
        'Put the approved content into the correct template and letterhead, format it, add relevant images, check the visual presentation, and upload the designed proposal.',
      assignees: [{ mode: 'role', roleKey: 'proposal_designer' }],
      completionRule: 'any',
      fields: [],
      files: [
        {
          key: 'designed_proposal',
          label: 'Designed proposal',
          required: true,
          acceptedExtensions: ['pdf', 'doc', 'docx'],
        },
      ],
      checklist: [],
      priority: 'high',
      dueInHours: 24,
      slaHours: 24,
      requiresApproval: false,
      nextStageKey: 'quality_check',
    },
    {
      key: 'quality_check',
      name: 'Quality Check',
      description:
        'Separate review stage, even when the same person designed the proposal (spec §26).',
      instructions:
        'Work through every check below. The proposal cannot be submitted for approval until all of them are complete.',
      assignees: [{ mode: 'role', roleKey: 'proposal_qc_owner' }],
      completionRule: 'any',
      fields: [],
      files: [],
      // Every item is mandatory: the engine blocks submission until all are
      // ticked (spec §27).
      checklist: [
        { key: 'formatting', label: 'Formatting checked', group: 'Formatting', required: true },
        { key: 'page_numbering', label: 'Page numbering checked', group: 'Formatting', required: true },
        { key: 'structure', label: 'Structure checked', group: 'Formatting', required: true },
        { key: 'fonts', label: 'Fonts checked', group: 'Formatting', required: true },
        { key: 'spacing', label: 'Spacing checked', group: 'Formatting', required: true },
        { key: 'alignment', label: 'Alignment checked', group: 'Formatting', required: true },
        { key: 'company_information', label: 'Company information checked', group: 'Content', required: true },
        { key: 'pricing_details', label: 'Pricing and details checked', group: 'Content', required: true },
        { key: 'grammar', label: 'Grammar checked', group: 'Content', required: true },
        { key: 'spelling', label: 'Spelling checked', group: 'Content', required: true },
        { key: 'images_checked', label: 'All images checked', group: 'Images', required: true },
        { key: 'image_quality', label: 'Image quality checked', group: 'Images', required: true },
        { key: 'image_alignment', label: 'Images properly aligned', group: 'Images', required: true },
        { key: 'letterhead', label: 'Correct letterhead and template', group: 'Document', required: true },
        { key: 'final_pdf', label: 'Final PDF checked', group: 'Document', required: true },
        { key: 'no_stray_dashes', label: 'No unnecessary dashes', group: 'Document', required: true },
        { key: 'overall_review', label: 'Overall proposal reviewed', group: 'Document', required: true },
      ],
      priority: 'high',
      dueInHours: 12,
      slaHours: 12,
      requiresApproval: false,
      nextStageKey: 'final_approval',
    },
    {
      key: 'final_approval',
      name: 'Final Approval',
      description: 'Approve the proposal, or send it back with the changes needed.',
      instructions:
        'Review the request, deliverables, content and designed proposal. Approve it, or request changes with a clear explanation of what to fix.',
      assignees: [{ mode: 'role', roleKey: 'final_proposal_approver' }],
      completionRule: 'any',
      fields: [],
      files: [],
      checklist: [],
      priority: 'urgent',
      dueInHours: 12,
      // Spec §43 shows this stage breaching a 12-hour SLA on the stuck view.
      slaHours: 12,
      requiresApproval: true,
      // Rejected work goes back to design, then re-runs quality check on its
      // way up. Configured per stage, never assumed to be the previous stage.
      rejectTargetStageKey: 'design_formatting',
      nextStageKey: 'client_dispatch',
    },
    {
      key: 'client_dispatch',
      name: 'Client Dispatch',
      description: 'Send the approved proposal to the client.',
      instructions:
        'Send the approved proposal to the client, then record who it went to and when.',
      // Back to whoever raised the request: they own the client relationship
      // (spec §31).
      assignees: [{ mode: 'initiator' }],
      completionRule: 'any',
      fields: [
        { key: 'recipient_email', label: 'Recipient email', type: 'email', required: true },
        { key: 'sent_at', label: 'Date and time sent', type: 'date', required: true },
        { key: 'dispatch_message', label: 'Message sent with the proposal', type: 'textarea', required: false },
        { key: 'dispatch_notes', label: 'Notes', type: 'textarea', required: false },
      ],
      files: [{ key: 'dispatch_proof', label: 'Proof of sending', required: false }],
      checklist: [],
      priority: 'high',
      dueInHours: 24,
      slaHours: 24,
      requiresApproval: false,
      nextStageKey: null,
    },
  ],
}
