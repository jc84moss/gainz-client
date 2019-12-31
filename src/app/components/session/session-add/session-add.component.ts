import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { Session } from 'src/app/data/entities/session';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { Activity } from 'src/app/data/entities/activity';
import { SessionService } from 'src/app/data/services/session.service';
import { ToastrService } from 'ngx-toastr';
import * as moment from 'moment';
import { formatDateToDatePicker, randonGuidGenerator } from 'src/app/shared/helper';
import { SessionPlan } from 'src/app/data/entities/session-plan';
import { EquipmentViewModel } from 'src/app/data/entities/ViewModel/equipmentviewmodel';
declare var $: any;
@Component({
  selector: 'app-session-add',
  templateUrl: './session-add.component.html',
  styleUrls: ['./session-add.component.css']
})
export class SessionAddComponent implements OnInit {

  sessionTitle = 'Session';
  sessionForm: FormGroup;
  isCollapsed = false
  session: Session;
  sessionPlan: SessionPlan;
  displayAddActivity: Boolean = false;
  onSaveDisable: boolean = false;
  private sub: Subscription;    

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private sessionService: SessionService,
    private toastr: ToastrService    
    ) { }

  ngOnInit() {
    $(document).ready(function(){
      $('select').formSelect();
      $('.datepicker').datepicker();
      var themeColor = '#ffd8a6'
      $(".select-dropdown").css("color", themeColor);
    });
    
    this.sessionForm = this.formBuilder.group({    
      weight: '',    
      sessionDate: '',    
      sessionType: ''  
    });

    this.sub = this.route.paramMap.subscribe(
      params => {
        const id = params.get('id');
        const sessionType = params.get('sessionType');
        if (id == '0'){
          const newSession: Session = { id: "0", weight: 0, sessionDate: new Date(), sessionType: '', activities: [] }
          this.displaySession(newSession);
        } else {
          //Get Session from service
          this.sessionService.getSession(id, sessionType).subscribe(
            (session: Session) => { 
              this.session = session;
              this.displaySession(session) }
          );
        }
      }
    )
  }


  saveSession(displayAddActivity: boolean = false): void {
    //disable save btns
    this.onSaveDisable = true;

    //validate form
    if (this.sessionForm.controls['sessionType'].value == '' || this.sessionForm.controls['sessionType'].value == undefined) {
      this.toastr.error("Must select a session type.", "Validation Error");
      this.onSaveDisable = false;
      return;
	  }

	//TODO possibly move this inside the sessions based on performance
	this.displayAddActivity = displayAddActivity;

    //Create or update session based on session id
    var session = { ...this.session, ...this.sessionForm.value};
    if (session.id == '0') {
      this.sessionService.createSession(session).subscribe(
          session => {
            this.session.id = session.id;
            this.session.sessionType = session.sessionType;
            this.onSaveDisable = false;
          });
    } else {
      this.sessionService.updateSession(session).subscribe(
        () => this.onSaveDisable = false
      );
    }
  }

  onNewActivites(activities: Activity[]){
    this.session.activities = activities;
    this.saveSession();
  }

  displaySession(session: Session): void {
    if (this.sessionForm){
      this.sessionForm.reset();
    }

    this.session = session;
    if (this.session.id == '0'){
      this.sessionTitle = 'Add Session';
    } else {
      this.sessionTitle = `Edit Session: ${moment(this.session.sessionDate).format('dddd, MMMM Do YYYY')}`;
    }

    $('.select-dropdown').val(this.session.sessionType);
    
    this.sessionForm.patchValue({
      weight: this.session.weight,
      sessionDate: formatDateToDatePicker(this.session.sessionDate),
      sessionType: this.session.sessionType
    });
  }

  saveSessionPlan() {
    //convert to session to session plan
    //TODO: Handle exsiting session plans
    this.sessionPlan = this.convertSessionToSessionPlan(this.session);

    console.log('post', this.sessionPlan);
  }

  removeSession() {
    if (this.session.id == '0') {
      this.router.navigate(['/sessions']);
    } else {
      this.sessionService.deleteSession(this.session.id, this.session.sessionType)
          .subscribe(
            isSuccesful => {
              if (isSuccesful) {
                this.toastr.success('Session successfully deleted.');
                this.router.navigate(['/sessions']);
              }
          }
      );
    }
  }

  onSaveComplete(): void {    
    this.sessionForm.reset();    
  }

  sort(activities: Activity[]): Activity[] {
    return activities.sort((a,b) => a.order - b.order);
  }

  private convertSessionToSessionPlan(session: Session): SessionPlan {
    let equpiment: EquipmentViewModel[] = [];

    session.activities.forEach(act => {
      equpiment.push({
        id: act.equipment.id,
        name: act.equipment.name
      });     
    });

    return {
      equipment: equpiment,
      id: randonGuidGenerator(),
      sessionPlanName: `${moment(session.sessionDate).format('MMMM-DD-YYYY')}-${session.sessionType}`
    }
  }
}
