export const PREVIOUS_AUDITOR_TEMPLATE_VERSION = '3';

export const previousAuditorCommunicationTemplate = `
<div class="preview-letter" data-template-version="${PREVIOUS_AUDITOR_TEMPLATE_VERSION}">
  <p class="header-title">On the letter head of the auditors</p>

  <table class="letter-header">
    <tr>
      <td class="to-block">
        To<br />
        M/s {{previous_auditor_name}}<br />
        Chartered Accountants<br />
        Firm Regn No {{previous_auditor_firm_reg_no}}<br />
        Address:<br />
        Email:
      </td>
      <td class="date-block">
        Date : {{date}}
      </td>
    </tr>
  </table>

  <p class="subject">
    Re: Our appointment as auditors of M/s {{entity_name}} (CIN {{cin}}, PAN {{pan}}) for the financial years {{financial_year}}.
  </p>

  <p>
    We have been appointed by M/s {{entity_name}} (the Entity, "Auditee") as {{auditor_appointment}} of the said entity.
  </p>

  <p>
    Clause 8 of Part I of Schedule I to The Chartered Accountants Act, 1949 requires communication to the previous auditors before accepting the appointment.
  </p>

  <p>
    We understand that you were the previous auditors of the aforesaid Auditee. Please let us know if you have any objection, professional or otherwise, in our accepting the said appointment.
  </p>

  <p>
    Please note that in case we do not hear from you within 07 days from the date of receipt of this letter, then we shall presume that you do not have any objection.
  </p>

  <p class="thank-you">Thanking You</p>

  <div class="signature">
    <p>For {{firm_name}}</p>
    <p>Chartered Accountants</p>
    <p>Firm Regn No {{firm_reg_no}}</p>

    <p class="signature-space"></p>
    <p>
      {{partner_name}}<br />
      Partner / Proprietor<br />
      M. No. {{partner_mem_no}}
    </p>
  </div>
</div>
`;
