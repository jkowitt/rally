import { NextRequest, NextResponse } from "next/server";
import {
  demoContacts,
  demoInteractions,
  demoOpportunities,
  calculateCRMStats,
  Contact,
  Interaction,
  Opportunity,
} from "@/lib/legacy-crm";

export const dynamic = 'force-dynamic';

// In-memory demo data that can be modified during session
let sessionContacts = [...demoContacts];
let sessionInteractions = [...demoInteractions];
let sessionOpportunities = [...demoOpportunities];

// GET /api/legacy-crm/demo - Get all demo data
export async function GET(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get("type");
    const id = request.nextUrl.searchParams.get("id");

    // Get specific contact
    if (type === "contact" && id) {
      const contact = sessionContacts.find((c) => c.id === id);
      if (!contact) {
        return NextResponse.json(
          { success: false, error: "Contact not found" },
          { status: 404 }
        );
      }

      const interactions = sessionInteractions.filter((i) => i.contactId === id);
      const opportunities = sessionOpportunities.filter((o) => o.contactId === id);

      return NextResponse.json({
        success: true,
        data: { contact, interactions, opportunities },
      });
    }

    // Get all contacts
    if (type === "contacts") {
      const filter = request.nextUrl.searchParams.get("filter");
      let filtered = sessionContacts;

      if (filter === "hot") {
        filtered = sessionContacts.filter((c) => c.relationship === "hot");
      } else if (filter === "follow-up") {
        const today = new Date().toISOString().split("T")[0];
        filtered = sessionContacts.filter(
          (c) => c.nextFollowUp && c.nextFollowUp <= today
        );
      } else if (filter === "high-importance") {
        filtered = sessionContacts.filter((c) => c.importance === "high");
      }

      return NextResponse.json({
        success: true,
        data: {
          contacts: filtered,
          total: filtered.length,
        },
      });
    }

    // Get opportunities / pipeline
    if (type === "pipeline") {
      const stages = ["lead", "qualified", "proposal", "negotiation", "closed-won", "closed-lost"];
      const pipeline = stages.map((stage) => ({
        stage,
        opportunities: sessionOpportunities.filter((o) => o.stage === stage),
        count: sessionOpportunities.filter((o) => o.stage === stage).length,
        value: sessionOpportunities
          .filter((o) => o.stage === stage)
          .reduce((sum, o) => sum + (o.value || 0), 0),
      }));

      return NextResponse.json({
        success: true,
        data: { pipeline },
      });
    }

    // Get dashboard stats
    const stats = calculateCRMStats(sessionContacts, sessionOpportunities);

    return NextResponse.json({
      success: true,
      data: {
        stats,
        contacts: sessionContacts,
        interactions: sessionInteractions.slice(0, 5), // Recent interactions
        opportunities: sessionOpportunities,
        isDemo: true,
      },
    });
  } catch (error) {
    console.error("Demo data error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch demo data" },
      { status: 500 }
    );
  }
}

// POST /api/legacy-crm/demo - Add demo data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (type === "contact") {
      const newContact: Contact = {
        id: `demo-${Date.now()}`,
        ...data,
        relationship: data.relationship || "new",
        importance: data.importance || "medium",
        tags: data.tags || [],
        notes: data.notes || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      sessionContacts.unshift(newContact);

      return NextResponse.json({
        success: true,
        data: {
          contact: newContact,
          message: "Contact added successfully",
        },
      });
    }

    if (type === "interaction") {
      const newInteraction: Interaction = {
        id: `int-${Date.now()}`,
        ...data,
        createdAt: new Date().toISOString(),
      };

      sessionInteractions.unshift(newInteraction);

      // Update contact's lastContact
      const contact = sessionContacts.find((c) => c.id === data.contactId);
      if (contact) {
        contact.lastContact = data.date || new Date().toISOString().split("T")[0];
        contact.updatedAt = new Date().toISOString();
      }

      return NextResponse.json({
        success: true,
        data: {
          interaction: newInteraction,
          message: "Interaction logged successfully",
        },
      });
    }

    if (type === "opportunity") {
      const newOpportunity: Opportunity = {
        id: `opp-${Date.now()}`,
        ...data,
        stage: data.stage || "lead",
        probability: data.probability || 10,
        notes: data.notes || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      sessionOpportunities.unshift(newOpportunity);

      return NextResponse.json({
        success: true,
        data: {
          opportunity: newOpportunity,
          message: "Opportunity created successfully",
        },
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Demo POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add demo data" },
      { status: 500 }
    );
  }
}

// PUT /api/legacy-crm/demo - Update demo data
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, id, data } = body;

    if (type === "contact") {
      const index = sessionContacts.findIndex((c) => c.id === id);
      if (index === -1) {
        return NextResponse.json(
          { success: false, error: "Contact not found" },
          { status: 404 }
        );
      }

      sessionContacts[index] = {
        ...sessionContacts[index],
        ...data,
        updatedAt: new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        data: {
          contact: sessionContacts[index],
          message: "Contact updated successfully",
        },
      });
    }

    if (type === "opportunity") {
      const index = sessionOpportunities.findIndex((o) => o.id === id);
      if (index === -1) {
        return NextResponse.json(
          { success: false, error: "Opportunity not found" },
          { status: 404 }
        );
      }

      sessionOpportunities[index] = {
        ...sessionOpportunities[index],
        ...data,
        updatedAt: new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        data: {
          opportunity: sessionOpportunities[index],
          message: "Opportunity updated successfully",
        },
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Demo PUT error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update demo data" },
      { status: 500 }
    );
  }
}

// DELETE /api/legacy-crm/demo - Reset demo data
export async function DELETE(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get("type");

    if (type === "reset") {
      // Reset to original demo data
      sessionContacts = [...demoContacts];
      sessionInteractions = [...demoInteractions];
      sessionOpportunities = [...demoOpportunities];

      return NextResponse.json({
        success: true,
        data: {
          message: "Demo data reset successfully",
        },
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid operation" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Demo DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reset demo data" },
      { status: 500 }
    );
  }
}
