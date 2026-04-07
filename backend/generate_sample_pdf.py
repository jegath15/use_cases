from fpdf import FPDF

class PDF(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 15)
        self.cell(80)
        self.cell(30, 10, 'Universal Corp HR Policy', 0, 0, 'C')
        self.ln(20)

    def chapter_title(self, title):
        self.set_font('Arial', 'B', 12)
        self.cell(0, 10, title, 0, 1, 'L')
        self.ln(4)

    def chapter_body(self, body):
        self.set_font('Arial', '', 12)
        self.multi_cell(0, 10, body)
        self.ln()

pdf = PDF()
pdf.add_page()

pdf.chapter_title('1. Casual Leave (CL)')
pdf.chapter_body('Employees are eligible for 12 days of casual leave per calendar year. Casual leave can be taken for a maximum of 3 consecutive days. Prior approval from the manager is required at least 24 hours in advance.')

pdf.chapter_title('2. Sick Leave (SL)')
pdf.chapter_body('Employees are entitled to 10 days of sick leave annually. For sick leave exceeding 2 consecutive days, a medical certificate must be submitted to the HR department.')

pdf.chapter_title('3. Work from Home (WFH)')
pdf.chapter_body('Universal Corp allows employees to work from home up to 2 days per week, subject to project requirements and manager approval. Employees must be available during core office hours (10:00 AM to 4:00 PM).')

pdf.chapter_title('4. Bereavement Leave')
pdf.chapter_body('In the unfortunate event of the death of an immediate family member, employees are granted 5 days of paid bereavement leave.')

pdf.output('hr_policy.pdf')
print("Sample HR Policy PDF created: hr_policy.pdf")
