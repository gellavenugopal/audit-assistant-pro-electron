export const ELIGIBILITY_CERT_TEMPLATE_VERSION = '1';

export const eligibilityCertificateTemplate = `
<div class="preview-letter" data-template-version="${ELIGIBILITY_CERT_TEMPLATE_VERSION}">
  <p class="header-title note">On the letter head of the auditor</p>

  <p class="spacer"></p>

  <p>Date: {{date}}</p>

  <p class="to-block">
    To<br />
    The Board of Directors<br />
    {{entity_name}}<br />
    {{entity_address}}
  </p>

  <p class="subject">
    Sub: Eligibility Certificate for appointment as a statutory auditor(s) of {{entity_name}}
  </p>

  <p>Dear Sir/Ma'am,</p>

  <p>
    In accordance with the requirements of second and third proviso to Section 139 (1) of the Companies Act, 2013 and
    based on the information obtained and procedures followed by me/us, I/we confirm that:
  </p>

  <p class="bullet">&bull; I/We am/are eligible for appointment and is not disqualified for the proposed appointment under the Companies Act, 2013, the Chartered Accountants Act, 1949 and the rules or regulations made thereunder.</p>
  <p class="bullet">&bull; The appointment, if made, shall be as per the term provided under the Companies Act, 2013.</p>
  <p class="bullet">&bull; The appointment, if made, shall be within the limits laid down by or under the authority of the Companies Act, 2013.</p>
  <p class="bullet">&bull; There is no order or pending proceedings against me/us with respect to professional matters of conduct before the Institute of Chartered Accountants of India or any competent authority or any Court.</p>
  <p class="bullet">&bull; I/We satisfy other criteria as provided under section 141 of the Companies Act, 2013.</p>

  <p>Yours faithfully,</p>

  <div class="signature">
    <p>For and Behalf of</p>
    <p>{{firm_name}}</p>
    <p>Chartered Accountants.</p>

    <p class="signature-space"></p>
    <p>
      CA {{partner_name}}<br />
      Partner<br />
      Membership No.: {{partner_mem_no}}<br />
      FRN: {{firm_reg_no}}
    </p>
  </div>
</div>
`;
