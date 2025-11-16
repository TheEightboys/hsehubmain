/**
 * HSE Automation Helper Functions
 * 
 * These functions implement the automated workflows requested:
 * 1. Risk Assessment → Auto Training Requirements
 * 2. Audit Finding → Auto Task Creation
 * 3. Measures → Automatic Assignment to Employees
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Auto-assign training requirements when a risk assessment is created/updated
 * 
 * Workflow:
 * 1. Check if the risk assessment is linked to an activity
 * 2. Look up required training from activity_training_requirements table
 * 3. Assign training to employees who are assigned to that activity
 * 
 * @param riskAssessmentId - The ID of the risk assessment
 * @param companyId - The company ID for data isolation
 */
export async function autoAssignTrainingFromRisk(
  riskAssessmentId: string,
  companyId: string
) {
  try {
    // 1. Get the risk assessment and check if it's linked to an activity
    const { data: riskData, error: riskError } = await supabase
      .from("risk_assessments")
      .select("id, title, activity_id")
      .eq("id", riskAssessmentId)
      .eq("company_id", companyId)
      .single();

    if (riskError) throw riskError;
    if (!(riskData as any)?.activity_id) {
      console.log("Risk assessment is not linked to an activity");
      return { success: false, message: "No activity linked" };
    }

    // 2. Get required training types for this activity
    const { data: trainingReqs, error: trainingError } = await supabase
      .from("activity_training_requirements" as any)
      .select("training_type_id, is_mandatory")
      .eq("activity_group_id", (riskData as any).activity_id)
      .eq("company_id", companyId);

    if (trainingError) throw trainingError;
    if (!trainingReqs || trainingReqs.length === 0) {
      console.log("No training requirements defined for this activity");
      return { success: false, message: "No training requirements found" };
    }

    // 3. Get employees assigned to this activity
    const { data: employeeAssignments, error: assignmentError } = await supabase
      .from("employee_activity_assignments" as any)
      .select("employee_id")
      .eq("activity_group_id", (riskData as any).activity_id)
      .eq("company_id", companyId);

    if (assignmentError) throw assignmentError;
    if (!employeeAssignments || employeeAssignments.length === 0) {
      console.log("No employees assigned to this activity");
      return { success: false, message: "No employees assigned" };
    }

    // 4. Create training records for each employee/training combination
    const trainingRecords = [];
    for (const emp of employeeAssignments) {
      for (const training of trainingReqs) {
        trainingRecords.push({
          employee_id: (emp as any).employee_id,
          training_type_id: (training as any).training_type_id,
          status: "required" as const,
          company_id: companyId,
          notes: `Auto-assigned from risk assessment: ${(riskData as any).title}`,
        });
      }
    }

    // 5. Insert training records (skip duplicates)
    const { data: insertedRecords, error: insertError } = await supabase
      .from("training_records")
      .upsert(trainingRecords, {
        onConflict: "employee_id,training_type_id,company_id",
        ignoreDuplicates: true,
      });

    if (insertError) throw insertError;

    return {
      success: true,
      message: `Assigned ${trainingReqs.length} training types to ${employeeAssignments.length} employees`,
      recordsCreated: trainingRecords.length,
    };
  } catch (error) {
    console.error("Error in autoAssignTrainingFromRisk:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Auto-create tasks from audit findings
 * 
 * Workflow:
 * 1. Create a task linked to the audit
 * 2. Set priority based on audit severity/status
 * 3. Assign to department head or safety officer
 * 
 * @param auditId - The ID of the audit
 * @param findingDescription - Description of the audit finding
 * @param companyId - The company ID for data isolation
 * @param assignedTo - Optional employee ID to assign the task to
 */
export async function autoCreateTaskFromAuditFinding(
  auditId: string,
  findingDescription: string,
  companyId: string,
  assignedTo?: string
) {
  try {
    // 1. Get audit details
    const { data: auditData, error: auditError } = await supabase
      .from("audits")
      .select("id, title, status, department_id, auditor_id")
      .eq("id", auditId)
      .eq("company_id", companyId)
      .single();

    if (auditError) throw auditError;

    // 2. Determine task priority based on audit status
    let priority: "low" | "medium" | "high" | "urgent" = "medium";
    if (auditData.status === "completed") {
      priority = "high"; // Findings from completed audits need attention
    }

    // 3. Determine who to assign the task to
    let taskAssignedTo = assignedTo;
    if (!taskAssignedTo) {
      // Try to assign to the auditor by default
      taskAssignedTo = auditData.auditor_id || undefined;
    }

    // 4. Calculate due date (7 days from now for findings)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    // 5. Create the task
    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .insert({
        title: `Audit Finding: ${auditData.title}`,
        description: findingDescription,
        audit_id: auditId,
        department_id: auditData.department_id,
        assigned_to: taskAssignedTo,
        status: "pending",
        priority: priority,
        due_date: dueDate.toISOString().split("T")[0],
        company_id: companyId,
      })
      .select()
      .single();

    if (taskError) throw taskError;

    return {
      success: true,
      message: "Task created successfully from audit finding",
      taskId: taskData.id,
      task: taskData,
    };
  } catch (error) {
    console.error("Error in autoCreateTaskFromAuditFinding:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Auto-assign measures to employees based on their activity assignments
 * 
 * Workflow:
 * 1. Get the measure details and linked entities (risk, audit, incident)
 * 2. Find relevant activity groups
 * 3. Get employees assigned to those activities
 * 4. Link the measure to those employees
 * 
 * @param measureId - The ID of the measure
 * @param companyId - The company ID for data isolation
 */
export async function autoAssignMeasuresToEmployees(
  measureId: string,
  companyId: string
) {
  try {
    // 1. Get measure details
    const { data: measureData, error: measureError } = await supabase
      .from("measures" as any)
      .select("id, title, risk_assessment_id, audit_id, incident_id")
      .eq("id", measureId)
      .eq("company_id", companyId)
      .single();

    if (measureError) throw measureError;

    let activityIds: string[] = [];

    // 2. Find related activities based on what the measure is linked to
    
    // If linked to a risk assessment, get its activity
    if ((measureData as any).risk_assessment_id) {
      const { data: riskData, error: riskError } = await supabase
        .from("activity_risk_links" as any)
        .select("activity_group_id")
        .eq("risk_assessment_id", (measureData as any).risk_assessment_id)
        .eq("company_id", companyId);

      if (!riskError && riskData) {
        activityIds.push(...(riskData as any).map((r: any) => r.activity_group_id));
      }
    }

    // If linked to an audit, get department activities
    if ((measureData as any).audit_id) {
      const { data: auditData, error: auditError } = await supabase
        .from("audits")
        .select("department_id")
        .eq("id", (measureData as any).audit_id)
        .eq("company_id", companyId)
        .single();

      if (!auditError && auditData?.department_id) {
        // Get all employees in that department
        const { data: deptEmployees, error: deptError } = await supabase
          .from("employees")
          .select("id")
          .eq("department_id", auditData.department_id)
          .eq("company_id", companyId);

        if (!deptError && deptEmployees) {
          // Get their activity assignments
          const { data: activities, error: actError } = await supabase
            .from("employee_activity_assignments" as any)
            .select("activity_group_id")
            .in(
              "employee_id",
              deptEmployees.map((e) => e.id)
            )
            .eq("company_id", companyId);

          if (!actError && activities) {
            activityIds.push(...(activities as any).map((a: any) => a.activity_group_id));
          }
        }
      }
    }

    // If linked to an incident, get affected employee's activities
    if ((measureData as any).incident_id) {
      const { data: incidentData, error: incidentError } = await supabase
        .from("incidents" as any)
        .select("affected_employee_id")
        .eq("id", (measureData as any).incident_id)
        .eq("company_id", companyId)
        .single();

      if (!incidentError && (incidentData as any)?.affected_employee_id) {
        const { data: activities, error: actError } = await supabase
          .from("employee_activity_assignments" as any)
          .select("activity_group_id")
          .eq("employee_id", (incidentData as any).affected_employee_id)
          .eq("company_id", companyId);

        if (!actError && activities) {
          activityIds.push(...(activities as any).map((a: any) => a.activity_group_id));
        }
      }
    }

    // Remove duplicates
    activityIds = [...new Set(activityIds)];

    if (activityIds.length === 0) {
      return {
        success: false,
        message: "No activities found to link measure to",
      };
    }

    // 3. Get all employees assigned to these activities
    const { data: employeeAssignments, error: assignmentError } = await supabase
      .from("employee_activity_assignments" as any)
      .select("employee_id")
      .in("activity_group_id", activityIds)
      .eq("company_id", companyId);

    if (assignmentError) throw assignmentError;
    if (!employeeAssignments || employeeAssignments.length === 0) {
      return {
        success: false,
        message: "No employees assigned to related activities",
      };
    }

    // 4. Update the measure with the first employee as responsible
    // (In a real system, you might want to notify all of them or have a more sophisticated assignment)
    const responsibleEmployeeId = (employeeAssignments[0] as any).employee_id;

    const { error: updateError } = await supabase
      .from("measures" as any)
      .update({
        responsible_person_id: responsibleEmployeeId,
      })
      .eq("id", measureId)
      .eq("company_id", companyId);

    if (updateError) throw updateError;

    return {
      success: true,
      message: `Measure assigned to ${employeeAssignments.length} employee(s)`,
      employeeCount: employeeAssignments.length,
      responsibleEmployee: responsibleEmployeeId,
    };
  } catch (error) {
    console.error("Error in autoAssignMeasuresToEmployees:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Helper function to check if an employee has completed required training for an activity
 * 
 * @param employeeId - The employee ID
 * @param activityGroupId - The activity group ID
 * @param companyId - The company ID
 * @returns Object with completion status and missing training types
 */
export async function checkEmployeeTrainingCompliance(
  employeeId: string,
  activityGroupId: string,
  companyId: string
) {
  try {
    // Get required training for the activity
    const { data: requiredTraining, error: reqError } = await supabase
      .from("activity_training_requirements" as any)
      .select("training_type_id, is_mandatory")
      .eq("activity_group_id", activityGroupId)
      .eq("company_id", companyId);

    if (reqError) throw reqError;

    if (!requiredTraining || requiredTraining.length === 0) {
      return { compliant: true, missingTraining: [] };
    }

    // Get employee's completed training
    const { data: completedTraining, error: compError } = await supabase
      .from("training_records")
      .select("training_type_id, status, completed_date")
      .eq("employee_id", employeeId)
      .eq("company_id", companyId)
      .in("status", ["completed"]);

    if (compError) throw compError;

    const completedTypeIds = new Set(
      (completedTraining as any)?.map((t: any) => t.training_type_id) || []
    );

    // Find missing mandatory training
    const missingTraining = (requiredTraining as any).filter(
      (req: any) => req.is_mandatory && !completedTypeIds.has(req.training_type_id)
    );

    return {
      compliant: missingTraining.length === 0,
      missingTraining: missingTraining.map((t: any) => t.training_type_id),
      completedCount: completedTraining?.length || 0,
      requiredCount: (requiredTraining as any).filter((r: any) => r.is_mandatory).length,
    };
  } catch (error) {
    console.error("Error in checkEmployeeTrainingCompliance:", error);
    return {
      compliant: false,
      missingTraining: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
