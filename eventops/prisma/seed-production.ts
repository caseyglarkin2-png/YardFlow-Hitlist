import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding PRODUCTION database...');
  console.log('📊 Creating comprehensive demo data for Manifest 2026\n');

  // ============================================================================
  // USERS
  // ============================================================================
  const hashedAdminPassword = await bcrypt.hash('YardFlow2026!', 10);
  const hashedDemoPassword = await bcrypt.hash('demo123', 10);

  const admin = await prisma.users.upsert({
    where: { email: 'admin@yardflow.com' },
    update: {},
    create: {
      id: 'user_admin_prod',
      email: 'admin@yardflow.com',
      name: 'Admin User',
      password: hashedAdminPassword,
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const demo = await prisma.users.upsert({
    where: { email: 'demo@yardflow.com' },
    update: {},
    create: {
      id: 'user_demo_prod',
      email: 'demo@yardflow.com',
      name: 'Demo User',
      password: hashedDemoPassword,
      role: 'MEMBER',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log('✅ Created 2 users (admin@yardflow.com, demo@yardflow.com)');

  // ============================================================================
  // EVENTS
  // ============================================================================
  const manifest2026 = await prisma.events.upsert({
    where: { id: 'manifest-2026-prod' },
    update: {},
    create: {
      id: 'manifest-2026-prod',
      name: 'Manifest 2026',
      location: 'Las Vegas Convention Center, NV',
      startDate: new Date('2026-02-10'),
      endDate: new Date('2026-02-12'),
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log('✅ Created event: Manifest 2026');

  // Link users to event
  await prisma.users.update({
    where: { id: admin.id },
    data: { eventId: manifest2026.id },
  });

  await prisma.users.update({
    where: { id: demo.id },
    data: { eventId: manifest2026.id },
  });

  // ============================================================================
  // TARGET ACCOUNTS (Supply Chain & Logistics Companies)
  // ============================================================================
  const accounts = [
    {
      id: 'acct_1_sysco',
      name: 'Sysco Corporation',
      website: 'https://www.sysco.com',
      industry: 'Food Distribution',
      companySize: 'ENTERPRISE',
      headquarters: 'Houston, TX',
      employeeCount: 57000,
      icpScore: 95,
      notes: 'Largest food distributor in North America. 330+ distribution facilities.',
    },
    {
      id: 'acct_2_uline',
      name: 'Uline',
      website: 'https://www.uline.com',
      industry: 'Shipping Supplies Distribution',
      companySize: 'ENTERPRISE',
      headquarters: 'Pleasant Prairie, WI',
      employeeCount: 8500,
      icpScore: 88,
      notes: 'Distributor of shipping, industrial, and packaging materials. 38 locations.',
    },
    {
      id: 'acct_3_penske',
      name: 'Penske Logistics',
      website: 'https://www.penskelogistics.com',
      industry: '3PL Logistics',
      companySize: 'ENTERPRISE',
      headquarters: 'Reading, PA',
      employeeCount: 25000,
      icpScore: 92,
      notes: '3PL provider with dedicated contract carriage, warehousing, and freight management.',
    },
    {
      id: 'acct_4_xpo',
      name: 'XPO Logistics',
      website: 'https://www.xpo.com',
      industry: 'Transportation & Logistics',
      companySize: 'ENTERPRISE',
      headquarters: 'Greenwich, CT',
      employeeCount: 42000,
      icpScore: 90,
      notes: 'Global provider of freight transportation and logistics. Heavy LTL focus.',
    },
    {
      id: 'acct_5_kenco',
      name: 'Kenco Logistics',
      website: 'https://www.kencogroup.com',
      industry: 'Warehousing & Distribution',
      companySize: 'LARGE',
      headquarters: 'Chattanooga, TN',
      employeeCount: 9000,
      icpScore: 85,
      notes: 'Third-party logistics provider. 125+ facilities across North America.',
    },
  ];

  for (const account of accounts) {
    await prisma.target_accounts.upsert({
      where: { id: account.id },
      update: {},
      create: {
        ...account,
        eventId: manifest2026.id,
        status: 'ACTIVE',
        createdBy: admin.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  console.log(`✅ Created ${accounts.length} target accounts`);

  // ============================================================================
  // PEOPLE (Contacts at target companies)
  // ============================================================================
  const people = [
    // Sysco contacts
    {
      id: 'person_1_sysco_vp',
      accountId: 'acct_1_sysco',
      name: 'Michael Chen',
      title: 'VP of Supply Chain Operations',
      email: 'michael.chen@sysco.com',
      persona: 'Ops',
      linkedinUrl: 'https://linkedin.com/in/michaelchen',
      phoneNumber: '+1-713-555-0100',
      location: 'Houston, TX',
    },
    {
      id: 'person_2_sysco_dir',
      accountId: 'acct_1_sysco',
      name: 'Sarah Williams',
      title: 'Director of Warehouse Operations',
      email: 'sarah.williams@sysco.com',
      persona: 'Ops',
      linkedinUrl: 'https://linkedin.com/in/sarahwilliams',
      location: 'Houston, TX',
    },
    // Uline contacts
    {
      id: 'person_3_uline_coo',
      accountId: 'acct_2_uline',
      name: 'David Thompson',
      title: 'Chief Operating Officer',
      email: 'david.thompson@uline.com',
      persona: 'ExecOps',
      linkedinUrl: 'https://linkedin.com/in/davidthompson',
      phoneNumber: '+1-262-555-0200',
      location: 'Pleasant Prairie, WI',
    },
    {
      id: 'person_4_uline_logistics',
      accountId: 'acct_2_uline',
      name: 'Jennifer Martinez',
      title: 'VP of Logistics',
      email: 'jennifer.martinez@uline.com',
      persona: 'Ops',
      linkedinUrl: 'https://linkedin.com/in/jennifermartinez',
      location: 'Pleasant Prairie, WI',
    },
    // Penske contacts
    {
      id: 'person_5_penske_svp',
      accountId: 'acct_3_penske',
      name: 'Robert Johnson',
      title: 'SVP of Operations',
      email: 'robert.johnson@penske.com',
      persona: 'ExecOps',
      linkedinUrl: 'https://linkedin.com/in/robertjohnson',
      phoneNumber: '+1-610-555-0300',
      location: 'Reading, PA',
    },
    {
      id: 'person_6_penske_procurement',
      accountId: 'acct_3_penske',
      name: 'Amanda Davis',
      title: 'Director of Procurement',
      email: 'amanda.davis@penske.com',
      persona: 'Procurement',
      linkedinUrl: 'https://linkedin.com/in/amandadavis',
      location: 'Reading, PA',
    },
    // XPO contacts
    {
      id: 'person_7_xpo_vp',
      accountId: 'acct_4_xpo',
      name: 'Christopher Brown',
      title: 'VP of Distribution Centers',
      email: 'christopher.brown@xpo.com',
      persona: 'Ops',
      linkedinUrl: 'https://linkedin.com/in/christopherbrown',
      phoneNumber: '+1-203-555-0400',
      location: 'Greenwich, CT',
    },
    {
      id: 'person_8_xpo_dir',
      accountId: 'acct_4_xpo',
      name: 'Lisa Anderson',
      title: 'Director of Yard Management',
      email: 'lisa.anderson@xpo.com',
      persona: 'Ops',
      linkedinUrl: 'https://linkedin.com/in/lisaanderson',
      location: 'Greenwich, CT',
    },
    // Kenco contacts
    {
      id: 'person_9_kenco_vp',
      accountId: 'acct_5_kenco',
      name: 'James Wilson',
      title: 'VP of Warehouse Technology',
      email: 'james.wilson@kencogroup.com',
      persona: 'Ops',
      linkedinUrl: 'https://linkedin.com/in/jameswilson',
      phoneNumber: '+1-423-555-0500',
      location: 'Chattanooga, TN',
    },
    {
      id: 'person_10_kenco_dir',
      accountId: 'acct_5_kenco',
      name: 'Maria Garcia',
      title: 'Director of Operations Excellence',
      email: 'maria.garcia@kencogroup.com',
      persona: 'Ops',
      linkedinUrl: 'https://linkedin.com/in/mariagarcia',
      location: 'Chattanooga, TN',
    },
  ];

  for (const person of people) {
    await prisma.people.upsert({
      where: { id: person.id },
      update: {},
      create: {
        ...person,
        status: 'ACTIVE',
        emailStatus: 'VALID',
        createdBy: admin.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  console.log(`✅ Created ${people.length} contacts`);

  // ============================================================================
  // COMPANY DOSSIERS (AI-generated context)
  // ============================================================================
  const dossiers = [
    {
      id: 'dossier_sysco',
      accountId: 'acct_1_sysco',
      companyOverview:
        'Sysco is the global leader in foodservice distribution, delivering products to restaurants, healthcare, education, and hospitality. With 330+ distribution facilities and 57,000 employees, they process millions of shipments daily.',
      keyPainPoints:
        'Dock scheduling inefficiencies, high dwell time at 330+ facilities, driver detention costs, manual trailer tracking, poor visibility into yard operations.',
      techStack: 'SAP ERP, Manhattan WMS, legacy TMS, manual yard check systems.',
      facilityCount: '330',
      operationalScale: 'ENTERPRISE',
      locations: 'North America (USA, Canada)',
      researchedBy: admin.id,
      researchedAt: new Date(),
    },
    {
      id: 'dossier_penske',
      accountId: 'acct_3_penske',
      companyOverview:
        'Penske Logistics is a premier 3PL provider offering dedicated contract carriage, warehousing, freight management, and supply chain consulting. Operates 450+ facilities globally.',
      keyPainPoints:
        'Client SLA pressure for dock turnaround times, trailer utilization optimization, multi-client yard coordination, driver wait time reduction.',
      techStack: 'Oracle WMS, custom TMS, telematics integrations.',
      facilityCount: '450',
      operationalScale: 'ENTERPRISE',
      locations: 'Global (North America, Europe, Asia)',
      researchedBy: admin.id,
      researchedAt: new Date(),
    },
    {
      id: 'dossier_kenco',
      accountId: 'acct_5_kenco',
      companyOverview:
        'Kenco is a leading third-party logistics company specializing in distribution center management, e-commerce fulfillment, and transportation management. 125+ facilities across North America.',
      keyPainPoints:
        'Manual yard checks consuming 2+ hours daily per facility, poor trailer visibility, inefficient dock assignment, seasonal volume surges.',
      techStack: 'Blue Yonder WMS, McLeod TMS, RFID pilot programs.',
      facilityCount: '125',
      operationalScale: 'LARGE',
      locations: 'North America',
      researchedBy: admin.id,
      researchedAt: new Date(),
    },
  ];

  for (const dossier of dossiers) {
    await prisma.company_dossiers.upsert({
      where: { id: dossier.id },
      update: {},
      create: dossier,
    });
  }

  console.log(`✅ Created ${dossiers.length} company dossiers`);

  // ============================================================================
  // CONTACT INSIGHTS (AI-generated personalization)
  // ============================================================================
  const insights = [
    {
      id: 'insight_sysco_vp',
      personId: 'person_1_sysco_vp',
      roleContext:
        'VP responsible for supply chain optimization across 330 facilities. Reports to EVP of Operations.',
      likelyPainPoints:
        'Reducing driver detention, improving dock throughput, visibility into trailer locations across massive network.',
      suggestedApproach:
        'Lead with ROI calculator showing annual savings from reduced dwell time. Emphasize enterprise scalability.',
      roiOpportunity: 'Estimated $8-12M annual savings from 15% reduction in detention and improved asset utilization.',
      confidence: 'HIGH',
      generatedBy: admin.id,
      generatedAt: new Date(),
    },
    {
      id: 'insight_penske_svp',
      personId: 'person_5_penske_svp',
      roleContext: 'Senior VP overseeing operational excellence for 3PL clients. Focus on SLA performance.',
      likelyPainPoints: 'Client SLA breaches due to yard inefficiencies, driver complaints about wait times.',
      suggestedApproach:
        'Focus on client retention through improved dock turnaround. Share case studies from 3PL customers.',
      roiOpportunity: 'Reduce SLA breaches by 30%, improve client NPS, reduce driver churn.',
      confidence: 'HIGH',
      generatedBy: admin.id,
      generatedAt: new Date(),
    },
    {
      id: 'insight_kenco_vp',
      personId: 'person_9_kenco_vp',
      roleContext:
        'Technology-focused VP championing digital transformation across warehouse operations.',
      likelyPainPoints: 'Manual yard checks, lack of real-time trailer visibility, integration with existing WMS.',
      suggestedApproach:
        'Emphasize API-first architecture, Blue Yonder integration, fast ROI from eliminating manual processes.',
      roiOpportunity: 'Eliminate 250+ hours monthly of manual yard checks, 20% improvement in dock utilization.',
      confidence: 'MEDIUM',
      generatedBy: admin.id,
      generatedAt: new Date(),
    },
  ];

  for (const insight of insights) {
    await prisma.contact_insights.upsert({
      where: { id: insight.id },
      update: {},
      create: insight,
    });
  }

  console.log(`✅ Created ${insights.length} contact insights`);

  // ============================================================================
  // CAMPAIGNS
  // ============================================================================
  const campaign = await prisma.campaigns.upsert({
    where: { id: 'campaign_manifest_2026' },
    update: {},
    create: {
      id: 'campaign_manifest_2026',
      eventId: manifest2026.id,
      name: 'Manifest 2026 - VP+ Outreach',
      description: 'Executive-level outreach campaign targeting VP+ operations leaders at top logistics companies.',
      targetPersonas: 'ExecOps,Ops',
      minIcpScore: 80,
      startDate: new Date('2026-01-15'),
      endDate: new Date('2026-02-12'),
      status: 'ACTIVE',
      goals: 'Book 15+ meetings at Manifest booth, generate 5 qualified opportunities.',
      createdBy: admin.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log('✅ Created campaign: Manifest 2026 - VP+ Outreach');

  // ============================================================================
  // SEQUENCES
  // ============================================================================
  const sequence = await prisma.sequences.upsert({
    where: { id: 'seq_manifest_exec' },
    update: {},
    create: {
      id: 'seq_manifest_exec',
      campaignId: campaign.id,
      name: 'Manifest Exec - 5 Touch',
      description: 'Multi-channel sequence for executive contacts: Email → LinkedIn → Email → Manifest → Call',
      status: 'ACTIVE',
      createdBy: admin.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log('✅ Created sequence: Manifest Exec - 5 Touch');

  // ============================================================================
  // SEQUENCE STEPS
  // ============================================================================
  const steps = [
    {
      id: 'step_1_email',
      sequenceId: sequence.id,
      stepNumber: 1,
      channel: 'EMAIL',
      delayDays: 0,
      subject: 'Reducing dock detention at {{company_name}}',
      template:
        'Hi {{first_name}},\n\nI noticed {{company_name}} operates {{facility_count}}+ facilities. With that scale, even small improvements in yard efficiency drive massive ROI.\n\nYardFlow customers eliminate 2+ hours of manual yard checks daily and reduce detention by 15-20%.\n\nWorth 15 minutes at Manifest (Feb 10-12)?\n\nBest,\nCasey',
    },
    {
      id: 'step_2_linkedin',
      sequenceId: sequence.id,
      stepNumber: 2,
      channel: 'LINKEDIN',
      delayDays: 3,
      template:
        "Hi {{first_name}}, sent you an email about yard operations at {{company_name}}. We're seeing 15-20% reductions in driver detention with our Yard Network System. Will you be at Manifest next month?",
    },
    {
      id: 'step_3_email',
      sequenceId: sequence.id,
      stepNumber: 3,
      channel: 'EMAIL',
      delayDays: 7,
      subject: 'ROI calculator for {{company_name}}',
      template:
        'Hi {{first_name}},\n\nBased on {{company_name}}\'s {{facility_count}} facilities, our calculator estimates ${{annual_savings}} in annual savings from:\n\n• Eliminating manual yard checks\n• Reducing driver detention 15-20%\n• Improving dock utilization\n\nSee full breakdown: [ROI Calculator Link]\n\nMeeting at Manifest booth #1847?\n\nCasey',
    },
    {
      id: 'step_4_manifest',
      sequenceId: sequence.id,
      stepNumber: 4,
      channel: 'MANIFEST',
      delayDays: 14,
      template:
        '{{first_name}}, attending Manifest next week? Would love 15 min to show how YardFlow reduces detention costs. Booth #1847 or grab coffee?',
    },
    {
      id: 'step_5_call',
      sequenceId: sequence.id,
      stepNumber: 5,
      channel: 'PHONE',
      delayDays: 21,
      template: 'Follow-up call attempt - reference email thread and ROI calculator.',
    },
  ];

  for (const step of steps) {
    await prisma.sequence_steps.upsert({
      where: { id: step.id },
      update: {},
      create: {
        ...step,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  console.log(`✅ Created ${steps.length} sequence steps`);

  // ============================================================================
  // ENROLL 3 CONTACTS IN SEQUENCE
  // ============================================================================
  const enrollments = [
    {
      id: 'enroll_sysco_vp',
      sequenceId: sequence.id,
      personId: 'person_1_sysco_vp',
      status: 'ACTIVE',
      currentStep: 1,
      enrolledBy: admin.id,
    },
    {
      id: 'enroll_penske_svp',
      sequenceId: sequence.id,
      personId: 'person_5_penske_svp',
      status: 'ACTIVE',
      currentStep: 1,
      enrolledBy: admin.id,
    },
    {
      id: 'enroll_kenco_vp',
      sequenceId: sequence.id,
      personId: 'person_9_kenco_vp',
      status: 'ACTIVE',
      currentStep: 1,
      enrolledBy: admin.id,
    },
  ];

  for (const enrollment of enrollments) {
    await prisma.sequence_enrollments.upsert({
      where: { id: enrollment.id },
      update: {},
      create: {
        ...enrollment,
        enrolledAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  console.log(`✅ Enrolled ${enrollments.length} contacts in sequence`);

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n🎉 Production seed complete!\n');
  console.log('📊 Summary:');
  console.log(`   👤 Users: 2 (admin@yardflow.com, demo@yardflow.com)`);
  console.log(`   🏢 Accounts: ${accounts.length}`);
  console.log(`   👥 Contacts: ${people.length}`);
  console.log(`   📄 Dossiers: ${dossiers.length}`);
  console.log(`   💡 Insights: ${insights.length}`);
  console.log(`   📧 Campaign: 1 active`);
  console.log(`   📬 Sequence: 1 (5 steps, 3 enrollments)`);
  console.log('\n🔐 Login credentials:');
  console.log('   Admin: admin@yardflow.com / YardFlow2026!');
  console.log('   Demo:  demo@yardflow.com / demo123');
  console.log('\n✅ Ready for testing!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
